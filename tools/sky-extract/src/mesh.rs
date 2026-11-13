//! Đọc mesh Roblox (.mesh, file cache của Studio), xuất OBJ / GLB, liệt kê mesh trong .rbxm
//! và tải mesh qua Open Cloud.

use std::{
    io::{Cursor, Read},
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use draco_core::{DataType, DecoderBuffer, GeometryAttributeType, Mesh, MeshDecoder, PointAttribute, PointIndex};
use rbx_dom_weak::types::Ref;
use serde_json::json;

use crate::{asset_id, asset_text, full_path, get_prop, load};

// ---------- Dữ liệu ----------

/// Mesh đã giải mã. Giữ nguyên hệ tọa độ Roblox (không lật trục nào).
#[derive(Clone, Debug, Default)]
pub struct MeshData {
    /// Ví dụ "version 7.00".
    pub version: String,
    pub positions: Vec<[f32; 3]>,
    pub normals: Option<Vec<[f32; 3]>>,
    /// UV nguyên bản trong file (V theo quy ước Roblox/DirectX, gốc ở trên-trái).
    pub uvs: Option<Vec<[f32; 2]>>,
    pub indices: Vec<[u32; 3]>,
    /// (số mặt giữ lại, tổng số mặt) khi file có thông tin LOD và đã cắt về LOD0.
    pub lod: Option<(usize, usize)>,
}

impl MeshData {
    pub fn vertex_count(&self) -> usize {
        self.positions.len()
    }

    pub fn triangle_count(&self) -> usize {
        self.indices.len()
    }

    /// Hộp bao (min, max); `None` nếu không có đỉnh.
    pub fn bbox(&self) -> Option<([f32; 3], [f32; 3])> {
        let first = *self.positions.first()?;
        let (mut lo, mut hi) = (first, first);
        for p in &self.positions {
            for k in 0..3 {
                lo[k] = lo[k].min(p[k]);
                hi[k] = hi[k].max(p[k]);
            }
        }
        Some((lo, hi))
    }

    /// Kích thước X, Y, Z của hộp bao.
    pub fn size(&self) -> [f32; 3] {
        match self.bbox() {
            Some((lo, hi)) => [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
            None => [0.0; 3],
        }
    }
}

// ---------- Giải mã ----------

/// Tìm "version N.NN" trong 4 KB đầu; trả về (vị trí, chuỗi phiên bản như "version 7.00").
fn find_header(data: &[u8]) -> Option<(usize, String)> {
    let head = &data[..data.len().min(4096)];
    let mut from = 0;
    while let Some(off) = head[from..].windows(8).position(|w| w == b"version ") {
        let s = from + off;
        let v = &head[s + 8..];
        if v.len() >= 5
            && v[0].is_ascii_digit()
            && v[1] == b'.'
            && v[2].is_ascii_digit()
            && v[3].is_ascii_digit()
            && (v.len() == 5 || v[4] == b'\n' || v[4] == b'\r' || !v[4].is_ascii_digit())
        {
            let ver = String::from_utf8_lossy(&head[s..s + 12]).to_string();
            return Some((s, ver));
        }
        from = s + 8;
    }
    None
}

fn rd_u32(b: &[u8], p: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(p..p + 4)?.try_into().ok()?))
}

fn rd_f32(b: &[u8], p: usize) -> Option<f32> {
    Some(f32::from_le_bytes(b.get(p..p + 4)?.try_into().ok()?))
}

/// Phạm vi mặt của LOD0 từ danh sách offset; không hợp lệ thì lấy hết.
fn lod0_range(offsets: &[u32], face_count: usize) -> (usize, usize) {
    if offsets.len() >= 2 {
        let (a, b) = (offsets[0] as usize, offsets[1] as usize);
        if a < b && b <= face_count {
            return (a, b);
        }
    }
    (0, face_count)
}

fn apply_lod(mesh: &mut MeshData, offsets: &[u32]) {
    let total = mesh.indices.len();
    let (a, b) = lod0_range(offsets, total);
    if (a, b) != (0, total) {
        mesh.indices = mesh.indices[a..b].to_vec();
        mesh.lod = Some((b - a, total));
    }
}

/// Giải mã mesh Roblox từ byte của file .mesh hoặc file cache (có thể có tiền tố "RBXH").
pub fn decode_mesh(bytes: &[u8]) -> Result<MeshData, String> {
    // Dữ liệu lạ không được làm sập chương trình: mọi panic của bộ giải mã thành lỗi.
    std::panic::catch_unwind(|| decode_inner(bytes))
        .unwrap_or_else(|_| Err("Bộ giải mã gặp sự cố với dữ liệu này (file hỏng?)".into()))
}

fn decode_inner(bytes: &[u8]) -> Result<MeshData, String> {
    let (start, version) =
        find_header(bytes).ok_or("Không phải mesh Roblox (không thấy “version N.NN”)")?;
    let data = &bytes[start..];
    let major = version.as_bytes()[8] - b'0';
    let mut mesh = match major {
        1..=5 => decode_old(data, &version)?,
        6 | 7 => decode_chunked(data, &version)?,
        _ => return Err(format!("Chưa hỗ trợ {version}")),
    };
    mesh.version = version;
    validate(&mesh)?;
    Ok(mesh)
}

fn validate(m: &MeshData) -> Result<(), String> {
    let n = m.positions.len() as u32;
    if m.indices.iter().any(|t| t.iter().any(|&i| i >= n)) {
        return Err("Chỉ số đỉnh vượt quá số đỉnh (file hỏng?)".into());
    }
    Ok(())
}

fn take_v2(
    vertices: &rbx_mesh::mesh::Vertices2,
    out: &mut MeshData,
    normals: &mut Vec<[f32; 3]>,
    uvs: &mut Vec<[f32; 2]>,
) {
    use rbx_mesh::mesh::Vertices2;
    match vertices {
        Vertices2::Full(v) => {
            for x in v {
                out.positions.push(x.pos);
                normals.push(x.norm);
                uvs.push(x.tex);
            }
        }
        Vertices2::Truncated(v) => {
            for x in v {
                out.positions.push(x.pos);
                normals.push(x.norm);
                uvs.push(x.tex);
            }
        }
    }
}

fn decode_old(data: &[u8], version: &str) -> Result<MeshData, String> {
    use rbx_mesh::mesh::{Mesh as Any, Mesh2};
    let parsed = rbx_mesh::read_mesh_versioned(Cursor::new(data))
        .map_err(|e| format!("Không đọc được {version}: {e}"))?;
    let mut out = MeshData::default();
    let mut normals = Vec::new();
    let mut uvs = Vec::new();

    let faces = |f: &[rbx_mesh::mesh::Face2]| -> Vec<[u32; 3]> {
        f.iter().map(|f| [f.0[0].0, f.0[1].0, f.0[2].0]).collect()
    };

    match parsed {
        Any::V1(m) => {
            for v in &m.vertices {
                out.positions.push(v.pos);
                normals.push(v.norm);
                uvs.push([v.tex[0], v.tex[1]]);
            }
            out.indices = (0..out.positions.len() as u32 / 3)
                .map(|i| [3 * i, 3 * i + 1, 3 * i + 2])
                .collect();
        }
        Any::V2(Mesh2 { vertices, faces: f, .. }) => {
            take_v2(&vertices, &mut out, &mut normals, &mut uvs);
            out.indices = faces(&f);
        }
        Any::V3(m) => {
            take_v2(&m.vertices, &mut out, &mut normals, &mut uvs);
            out.indices = faces(&m.faces);
            let offs: Vec<u32> = m.lods.iter().map(|l| l.0).collect();
            apply_lod(&mut out, &offs);
        }
        Any::V4(m) => {
            for x in &m.vertices {
                out.positions.push(x.pos);
                normals.push(x.norm);
                uvs.push(x.tex);
            }
            out.indices = faces(&m.faces);
            let offs: Vec<u32> = m.lods.iter().map(|l| l.0).collect();
            apply_lod(&mut out, &offs);
        }
        Any::V5(m) => {
            for x in &m.vertices {
                out.positions.push(x.pos);
                normals.push(x.norm);
                uvs.push(x.tex);
            }
            out.indices = faces(&m.faces);
            let offs: Vec<u32> = m.lods.iter().map(|l| l.0).collect();
            apply_lod(&mut out, &offs);
        }
    }
    out.normals = Some(normals);
    out.uvs = Some(uvs);
    Ok(out)
}

/// Mesh v6/v7: "version N.00\n" rồi các chunk (tên 8 byte, u32 phiên bản, u32 kích thước, thân).
fn decode_chunked(data: &[u8], version: &str) -> Result<MeshData, String> {
    let mut p = data.iter().position(|&b| b == b'\n').map(|i| i + 1).unwrap_or(13);
    let mut mesh: Option<MeshData> = None;
    let mut lods: Option<Vec<u32>> = None;
    while p + 16 <= data.len() {
        let name_raw = &data[p..p + 8];
        let name = String::from_utf8_lossy(name_raw).trim_end_matches('\0').to_string();
        let ver = rd_u32(data, p + 8).unwrap_or(0);
        let size = rd_u32(data, p + 12).unwrap_or(0) as usize;
        let end = (p + 16)
            .checked_add(size)
            .filter(|&e| e <= data.len())
            .ok_or_else(|| format!("Chunk {name} vượt quá kích thước file"))?;
        let body = &data[p + 16..end];
        match (name.as_str(), ver) {
            ("COREMESH", 1) => mesh = Some(parse_coremesh_v1(body)?),
            ("COREMESH", 2) => mesh = Some(parse_coremesh_draco(body)?),
            ("COREMESH", v) => return Err(format!("COREMESH phiên bản {v} chưa được hỗ trợ")),
            ("LODS", 1) => lods = parse_lods_v1(body),
            _ => {}
        }
        p = end;
    }
    let mut mesh = mesh.ok_or_else(|| format!("{version}: không có chunk COREMESH"))?;
    if let Some(offs) = lods {
        apply_lod(&mut mesh, &offs);
    }
    Ok(mesh)
}

/// LODS v1 (suy ra từ file thật): u16 kiểu LOD, u8 số LOD chất lượng cao, u32 số mốc,
/// rồi mỗi mốc một u32 là chỉ số mặt bắt đầu của LOD. Sai độ dài thì bỏ qua (giữ mọi mặt).
fn parse_lods_v1(body: &[u8]) -> Option<Vec<u32>> {
    let count = rd_u32(body, 3)? as usize;
    if body.len() != 7 + 4 * count {
        return None;
    }
    (0..count).map(|i| rd_u32(body, 7 + 4 * i)).collect()
}

/// COREMESH v1 (không nén): u32 số đỉnh, mỗi đỉnh 40 byte
/// (pos f32x3, normal f32x3, uv f32x2, tangent i8x4, color u8x4), u32 số mặt, mỗi mặt u32x3.
fn parse_coremesh_v1(body: &[u8]) -> Result<MeshData, String> {
    let bad = || "COREMESH v1 bị cắt ngắn".to_string();
    let nv = rd_u32(body, 0).ok_or_else(bad)? as usize;
    let vend = nv.checked_mul(40).and_then(|x| x.checked_add(4)).ok_or_else(bad)?;
    if body.len() < vend + 4 {
        return Err(bad());
    }
    let nf = rd_u32(body, vend).ok_or_else(bad)? as usize;
    let fend = nf.checked_mul(12).and_then(|x| x.checked_add(vend + 4)).ok_or_else(bad)?;
    if body.len() < fend {
        return Err(bad());
    }
    let mut m = MeshData::default();
    let (mut ns, mut uvs) = (Vec::with_capacity(nv), Vec::with_capacity(nv));
    for i in 0..nv {
        let o = 4 + i * 40;
        let f = |k: usize| rd_f32(body, o + 4 * k).unwrap_or(0.0);
        m.positions.push([f(0), f(1), f(2)]);
        ns.push([f(3), f(4), f(5)]);
        uvs.push([f(6), f(7)]);
    }
    for i in 0..nf {
        let o = vend + 4 + i * 12;
        let u = |k: usize| rd_u32(body, o + 4 * k).unwrap_or(0);
        m.indices.push([u(0), u(1), u(2)]);
    }
    m.normals = Some(ns);
    m.uvs = Some(uvs);
    Ok(m)
}

fn read_floats(a: &PointAttribute, pt: u32, n: usize) -> Vec<f32> {
    let idx = a.mapped_index(PointIndex(pt)).0 as usize;
    let off = idx * a.byte_stride() as usize;
    let bytes = a.buffer().data();
    (0..n)
        .map(|k| {
            let s = off + k * 4;
            bytes
                .get(s..s + 4)
                .map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
                .unwrap_or(0.0)
        })
        .collect()
}

/// COREMESH v2: u32 độ dài + bitstream Draco.
fn parse_coremesh_draco(body: &[u8]) -> Result<MeshData, String> {
    let len = rd_u32(body, 0).ok_or("COREMESH v2 trống")? as usize;
    let draco = body
        .get(4..4usize.saturating_add(len))
        .ok_or("COREMESH v2 bị cắt ngắn")?;
    let mut buf = DecoderBuffer::new(draco);
    let mut mesh = Mesh::new();
    MeshDecoder::new()
        .decode(&mut buf, &mut mesh)
        .map_err(|e| format!("Giải nén Draco thất bại: {e:?}"))?;

    let n = mesh.num_points() as u32;
    let pos = mesh
        .named_attribute(GeometryAttributeType::Position)
        .ok_or("Mesh không có thuộc tính Position")?;
    let mut m = MeshData::default();
    for i in 0..n {
        let v = read_floats(pos, i, 3);
        m.positions.push([v[0], v[1], v[2]]);
    }
    let f32_attr = |a: &PointAttribute, comps: u8| a.data_type() == DataType::Float32 && a.num_components() == comps;
    // Normal: thuộc tính Normal, hoặc Generic kiểu float32x3 (Roblox dùng cách này).
    let normal = mesh
        .named_attribute(GeometryAttributeType::Normal)
        .filter(|a| f32_attr(a, 3))
        .or_else(|| {
            (0..mesh.num_attributes())
                .map(|i| mesh.attribute(i))
                .find(|a| a.attribute_type() == GeometryAttributeType::Generic && f32_attr(a, 3))
        });
    if let Some(a) = normal {
        m.normals = Some(
            (0..n)
                .map(|i| {
                    let v = read_floats(a, i, 3);
                    [v[0], v[1], v[2]]
                })
                .collect(),
        );
    }
    if let Some(a) = mesh
        .named_attribute(GeometryAttributeType::TexCoord)
        .filter(|a| f32_attr(a, 2))
    {
        m.uvs = Some(
            (0..n)
                .map(|i| {
                    let v = read_floats(a, i, 2);
                    [v[0], v[1]]
                })
                .collect(),
        );
    }
    for f in 0..mesh.num_faces() {
        let face = mesh.face(draco_core::FaceIndex(f as u32));
        m.indices.push([face[0].0, face[1].0, face[2].0]);
    }
    Ok(m)
}

// ---------- Xuất OBJ / GLB ----------

/// Xuất Wavefront OBJ. Tọa độ giữ nguyên; riêng V của UV được đổi `1 - v` vì OBJ có gốc UV ở dưới-trái.
pub fn to_obj(m: &MeshData) -> String {
    use std::fmt::Write;
    let mut s = String::with_capacity(m.positions.len() * 80);
    let _ = writeln!(s, "# sky-extract · {}", m.version);
    for p in &m.positions {
        let _ = writeln!(s, "v {} {} {}", p[0], p[1], p[2]);
    }
    if let Some(uvs) = &m.uvs {
        for t in uvs {
            let _ = writeln!(s, "vt {} {}", t[0], 1.0 - t[1]);
        }
    }
    if let Some(ns) = &m.normals {
        for n in ns {
            let _ = writeln!(s, "vn {} {} {}", n[0], n[1], n[2]);
        }
    }
    let (has_t, has_n) = (m.uvs.is_some(), m.normals.is_some());
    for t in &m.indices {
        let [a, b, c] = t.map(|i| i + 1);
        let _ = match (has_t, has_n) {
            (true, true) => writeln!(s, "f {a}/{a}/{a} {b}/{b}/{b} {c}/{c}/{c}"),
            (true, false) => writeln!(s, "f {a}/{a} {b}/{b} {c}/{c}"),
            (false, true) => writeln!(s, "f {a}//{a} {b}//{b} {c}//{c}"),
            (false, false) => writeln!(s, "f {a} {b} {c}"),
        };
    }
    s
}

fn pad4(v: &mut Vec<u8>, fill: u8) {
    while v.len() % 4 != 0 {
        v.push(fill);
    }
}

/// Xuất glTF 2.0 nhị phân (.glb): một mesh, một primitive, chỉ số u32.
pub fn to_glb(m: &MeshData) -> Vec<u8> {
    let mut bin: Vec<u8> = Vec::new();
    let mut views = Vec::new();
    let mut accessors = Vec::new();

    // Chỉ số
    let idx_off = bin.len();
    for t in &m.indices {
        for i in t {
            bin.extend_from_slice(&i.to_le_bytes());
        }
    }
    views.push(json!({"buffer": 0, "byteOffset": idx_off, "byteLength": bin.len() - idx_off, "target": 34963}));
    accessors.push(json!({"bufferView": 0, "componentType": 5125, "count": m.indices.len() * 3, "type": "SCALAR"}));

    let mut attrs = serde_json::Map::new();
    // Vị trí
    let (lo, hi) = m.bbox().unwrap_or(([0.0; 3], [0.0; 3]));
    let off = bin.len();
    for p in &m.positions {
        for c in p {
            bin.extend_from_slice(&c.to_le_bytes());
        }
    }
    views.push(json!({"buffer": 0, "byteOffset": off, "byteLength": bin.len() - off, "target": 34962}));
    accessors.push(json!({"bufferView": views.len() - 1, "componentType": 5126, "count": m.positions.len(),
        "type": "VEC3", "min": lo, "max": hi}));
    attrs.insert("POSITION".into(), json!(accessors.len() - 1));

    if let Some(ns) = &m.normals {
        let off = bin.len();
        for n in ns {
            for c in n {
                bin.extend_from_slice(&c.to_le_bytes());
            }
        }
        views.push(json!({"buffer": 0, "byteOffset": off, "byteLength": bin.len() - off, "target": 34962}));
        accessors.push(json!({"bufferView": views.len() - 1, "componentType": 5126, "count": ns.len(), "type": "VEC3"}));
        attrs.insert("NORMAL".into(), json!(accessors.len() - 1));
    }
    if let Some(uvs) = &m.uvs {
        let off = bin.len();
        for t in uvs {
            for c in t {
                bin.extend_from_slice(&c.to_le_bytes());
            }
        }
        views.push(json!({"buffer": 0, "byteOffset": off, "byteLength": bin.len() - off, "target": 34962}));
        accessors.push(json!({"bufferView": views.len() - 1, "componentType": 5126, "count": uvs.len(), "type": "VEC2"}));
        attrs.insert("TEXCOORD_0".into(), json!(accessors.len() - 1));
    }

    let doc = json!({
        "asset": {"version": "2.0", "generator": "sky-extract"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": attrs, "indices": 0, "mode": 4}]}],
        "buffers": [{"byteLength": bin.len()}],
        "bufferViews": views,
        "accessors": accessors,
    });
    let mut js = serde_json::to_vec(&doc).unwrap_or_default();
    pad4(&mut js, b' ');
    pad4(&mut bin, 0);

    let total = 12 + 8 + js.len() + 8 + bin.len();
    let mut out = Vec::with_capacity(total);
    out.extend_from_slice(b"glTF");
    out.extend_from_slice(&2u32.to_le_bytes());
    out.extend_from_slice(&(total as u32).to_le_bytes());
    out.extend_from_slice(&(js.len() as u32).to_le_bytes());
    out.extend_from_slice(b"JSON");
    out.extend_from_slice(&js);
    out.extend_from_slice(&(bin.len() as u32).to_le_bytes());
    out.extend_from_slice(b"BIN\0");
    out.extend_from_slice(&bin);
    out
}

// ---------- Quét cache Studio ----------

#[derive(Clone, Debug)]
pub struct CacheEntry {
    pub path: PathBuf,
    pub size: u64,
    /// Ví dụ "version 7.00".
    pub version: String,
    pub modified: Option<SystemTime>,
}

/// Thư mục cache của Roblox Studio (chỉ đọc).
pub fn cache_dir() -> Option<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")?;
    Some(PathBuf::from(base).join("Roblox").join("rbx-storage"))
}

fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        match e.file_type() {
            Ok(t) if t.is_dir() => walk(&p, out),
            Ok(t) if t.is_file() => out.push(p),
            _ => {}
        }
    }
}

/// Quét cache Studio, chỉ đọc 4 KB đầu mỗi file. Mới nhất trước. KHÔNG ghi/xóa gì.
pub fn scan_studio_cache() -> Vec<CacheEntry> {
    let Some(root) = cache_dir() else { return Vec::new() };
    let mut files = Vec::new();
    walk(&root, &mut files);
    let mut out = Vec::new();
    for path in files {
        let Ok(mut f) = std::fs::File::open(&path) else { continue };
        let mut head = Vec::with_capacity(4096);
        if f.by_ref().take(4096).read_to_end(&mut head).is_err() {
            continue;
        }
        let Some((_, version)) = find_header(&head) else { continue };
        let Ok(md) = f.metadata() else { continue };
        out.push(CacheEntry { path, size: md.len(), version, modified: md.modified().ok() });
    }
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    out
}

/// "YYYY-MM-DD HH:MM" (UTC) cho giao diện.
pub fn format_time(t: SystemTime) -> String {
    let secs = t.duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) as i64;
    let (days, rem) = (secs.div_euclid(86400), secs.rem_euclid(86400));
    // Thuật toán civil_from_days (Howard Hinnant).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02} {:02}:{:02}", rem / 3600, rem % 3600 / 60)
}

// ---------- Mesh trong file .rbxm ----------

#[derive(Clone, Debug)]
pub struct MeshRef {
    pub name: String,
    pub path: String,
    /// "MeshPart" hoặc "SpecialMesh".
    pub class: String,
    pub mesh_id: Option<String>,
    pub texture_id: Option<String>,
}

const MESH_PROPS: &[&str] = &["MeshId", "MeshContent"];
const TEXTURE_PROPS: &[&str] = &["TextureID", "TextureId", "TextureContent"];

/// Liệt kê MeshPart và SpecialMesh trong file .rbxm/.rbxl/.rbxmx/.rbxlx.
pub fn extract_mesh_refs(path: &Path) -> Result<Vec<MeshRef>, String> {
    let dom = load(path)?;
    let mut out = Vec::new();
    let mut stack: Vec<Ref> = vec![dom.root_ref()];
    while let Some(r) = stack.pop() {
        let Some(inst) = dom.get_by_ref(r) else { continue };
        stack.extend(inst.children().iter().rev().copied());
        if inst.class != "MeshPart" && inst.class != "SpecialMesh" {
            continue;
        }
        let id_of = |names: &[&str]| get_prop(inst, names).map(asset_text).and_then(|t| asset_id(&t));
        out.push(MeshRef {
            name: inst.name.clone(),
            path: full_path(&dom, r),
            class: inst.class.to_string(),
            mesh_id: id_of(MESH_PROPS),
            texture_id: id_of(TEXTURE_PROPS),
        });
    }
    Ok(out)
}

// ---------- Open Cloud ----------

const MAX_DOWNLOAD: u64 = 100 * 1024 * 1024;

/// Tải asset qua Asset Delivery API. Khóa API chỉ dùng cho request đầu, không ghi log hay lưu.
pub fn download_asset(id: &str, api_key: &str) -> Result<Vec<u8>, String> {
    let id = id.trim();
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
        return Err("ID asset không hợp lệ".into());
    }
    if api_key.trim().is_empty() {
        return Err("Chưa nhập API key".into());
    }
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(60))
        .user_agent("sky-extract-studio/0.1")
        .build();
    let url = format!("https://apis.roblox.com/asset-delivery-api/v1/assetId/{id}");
    let resp = agent
        .get(&url)
        .set("x-api-key", api_key.trim())
        .call()
        .map_err(|e| match e {
            ureq::Error::Status(401, _) => "API key không hợp lệ (401)".to_string(),
            ureq::Error::Status(403, _) => "API key không đủ quyền asset-delivery (403)".to_string(),
            ureq::Error::Status(404, _) => "Không tìm thấy asset (404)".to_string(),
            ureq::Error::Status(c, _) => format!("Open Cloud trả về lỗi HTTP {c}"),
            ureq::Error::Transport(t) => format!("Lỗi mạng: {}", t.kind()),
        })?;
    let v: serde_json::Value = resp.into_json().map_err(|e| format!("Phản hồi không phải JSON: {e}"))?;
    let location = v
        .get("location")
        .and_then(|l| l.as_str())
        .or_else(|| v.pointer("/locations/0/location").and_then(|l| l.as_str()))
        .ok_or("Phản hồi không có trường location")?
        .to_string();
    // Yêu cầu thứ hai tới CDN: không gửi khóa API.
    let resp = agent.get(&location).call().map_err(|e| match e {
        ureq::Error::Status(c, _) => format!("Tải từ CDN thất bại (HTTP {c})"),
        ureq::Error::Transport(t) => format!("Lỗi mạng: {}", t.kind()),
    })?;
    let mut buf = Vec::new();
    resp.into_reader()
        .take(MAX_DOWNLOAD + 1)
        .read_to_end(&mut buf)
        .map_err(|e| format!("Lỗi khi tải: {e}"))?;
    if buf.len() as u64 > MAX_DOWNLOAD {
        return Err("File lớn hơn 100 MB, đã dừng".into());
    }
    Ok(buf)
}

// ---------- Kiểm thử ----------

#[cfg(test)]
mod tests {
    use super::*;
    use rbx_dom_weak::{types::Content, types::Variant, InstanceBuilder, WeakDom};

    fn triangle() -> MeshData {
        MeshData {
            version: "version 7.00".into(),
            positions: vec![[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.0, 2.0, 3.0]],
            normals: Some(vec![[0.0, 0.0, 1.0]; 3]),
            uvs: Some(vec![[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]),
            indices: vec![[0, 1, 2]],
            lod: None,
        }
    }

    #[test]
    fn stats_and_bbox() {
        let m = triangle();
        assert_eq!((m.vertex_count(), m.triangle_count()), (3, 1));
        assert_eq!(m.size(), [1.0, 2.0, 3.0]);
    }

    #[test]
    fn obj_writer() {
        let obj = to_obj(&triangle());
        assert_eq!(obj.lines().filter(|l| l.starts_with("v ")).count(), 3);
        assert_eq!(obj.lines().filter(|l| l.starts_with("vt ")).count(), 3);
        assert_eq!(obj.lines().filter(|l| l.starts_with("vn ")).count(), 3);
        assert!(obj.contains("\nv 0 2 3\n"));
        assert!(obj.contains("\nf 1/1/1 2/2/2 3/3/3\n"));
        assert!(obj.contains("\nvt 0 1\n")); // v = 0 -> 1
    }

    #[test]
    fn glb_writer() {
        let glb = to_glb(&triangle());
        assert_eq!(&glb[0..4], b"glTF");
        assert_eq!(rd_u32(&glb, 4), Some(2));
        assert_eq!(rd_u32(&glb, 8), Some(glb.len() as u32));
        assert_eq!(glb.len() % 4, 0);
        let jlen = rd_u32(&glb, 12).unwrap() as usize;
        assert_eq!(&glb[16..20], b"JSON");
        assert_eq!(jlen % 4, 0);
        let doc: serde_json::Value = serde_json::from_slice(&glb[20..20 + jlen]).unwrap();
        let bo = 20 + jlen;
        let blen = rd_u32(&glb, bo).unwrap() as usize;
        assert_eq!(&glb[bo + 4..bo + 8], b"BIN\0");
        assert_eq!(bo + 8 + blen, glb.len());
        assert_eq!(doc["buffers"][0]["byteLength"].as_u64().unwrap() as usize, blen);
        let pos = doc["meshes"][0]["primitives"][0]["attributes"]["POSITION"].as_u64().unwrap() as usize;
        let acc = &doc["accessors"][pos];
        assert_eq!(acc["type"], "VEC3");
        assert_eq!(acc["count"], 3);
        assert_eq!(acc["min"], json!([0.0, 0.0, 0.0]));
        assert_eq!(acc["max"], json!([1.0, 2.0, 3.0]));
        assert!(doc["meshes"][0]["primitives"][0]["attributes"]["NORMAL"].is_number());
        assert!(doc["meshes"][0]["primitives"][0]["attributes"]["TEXCOORD_0"].is_number());
    }

    fn chunk(name: &str, ver: u32, body: &[u8]) -> Vec<u8> {
        let mut c = vec![0u8; 8];
        c[..name.len()].copy_from_slice(name.as_bytes());
        c.extend_from_slice(&ver.to_le_bytes());
        c.extend_from_slice(&(body.len() as u32).to_le_bytes());
        c.extend_from_slice(body);
        c
    }

    /// Dựng file mesh v7 với COREMESH v1 gồm 4 đỉnh, 2 mặt.
    fn synth_v7() -> Vec<u8> {
        let mut body = 4u32.to_le_bytes().to_vec();
        for i in 0..4u32 {
            for f in [i as f32, 0.5, -1.0, 0.0, 1.0, 0.0, 0.25, 0.75] {
                body.extend_from_slice(&f.to_le_bytes());
            }
            body.extend_from_slice(&[0, 0, 127, 0, 255, 255, 255, 255]);
        }
        body.extend_from_slice(&2u32.to_le_bytes());
        for t in [[0u32, 1, 2], [1, 3, 2]] {
            for i in t {
                body.extend_from_slice(&i.to_le_bytes());
            }
        }
        let mut out = b"RBXH\0\0\0\0".to_vec(); // tiền tố giả như file cache
        out.extend_from_slice(b"version 7.00\n");
        out.extend(chunk("COREMESH", 1, &body));
        out
    }

    #[test]
    fn coremesh_v1_parser() {
        let m = decode_mesh(&synth_v7()).unwrap();
        assert_eq!(m.version, "version 7.00");
        assert_eq!((m.vertex_count(), m.triangle_count()), (4, 2));
        assert_eq!(m.positions[3], [3.0, 0.5, -1.0]);
        assert_eq!(m.normals.as_ref().unwrap()[0], [0.0, 1.0, 0.0]);
        assert_eq!(m.uvs.as_ref().unwrap()[2], [0.25, 0.75]);
        assert_eq!(m.indices[1], [1, 3, 2]);
    }

    #[test]
    fn lods_chunk_keeps_lod0() {
        let mut data = synth_v7();
        let mut lods = vec![0u8, 0, 1];
        lods.extend_from_slice(&2u32.to_le_bytes());
        lods.extend_from_slice(&0u32.to_le_bytes());
        lods.extend_from_slice(&1u32.to_le_bytes());
        data.extend(chunk("LODS", 1, &lods));
        let m = decode_mesh(&data).unwrap();
        assert_eq!(m.triangle_count(), 1);
        assert_eq!(m.lod, Some((1, 2)));
    }

    #[test]
    fn rejects_garbage_and_truncated() {
        assert!(decode_mesh(b"hello").is_err());
        let d = synth_v7();
        assert!(decode_mesh(&d[..d.len() - 10]).is_err());
    }

    #[test]
    fn text_v1_mesh() {
        let txt = "version 1.01\n1\n[0,0,0][0,1,0][0,0,0] [1,0,0][0,1,0][1,0,0] [0,1,0][0,1,0][0,1,0]\n";
        let m = decode_mesh(txt.as_bytes()).unwrap();
        assert_eq!((m.vertex_count(), m.triangle_count()), (3, 1));
    }

    #[test]
    fn mesh_refs_round_trip() {
        let mp = InstanceBuilder::new("MeshPart")
            .with_name("Cánh")
            .with_property("MeshId", Variant::Content(Content::from_uri("rbxassetid://111")))
            .with_property("TextureID", Variant::Content(Content::from_uri("rbxassetid://222")));
        let sm = InstanceBuilder::new("SpecialMesh")
            .with_name("Mesh")
            .with_property("MeshId", Variant::Content(Content::from_uri("rbxassetid://333")))
            .with_property("TextureId", Variant::Content(Content::from_uri("rbxassetid://444")));
        let part = InstanceBuilder::new("Part").with_name("Part").with_child(sm);
        let folder = InstanceBuilder::new("Folder").with_name("Root").with_child(mp).with_child(part);
        let dom = WeakDom::new(InstanceBuilder::new("DataModel").with_child(folder));
        let mut buf = Vec::new();
        rbx_binary::to_writer(&mut buf, &dom, &dom.root().children().to_vec()).unwrap();

        let dir = std::env::temp_dir().join("sky-extract-test-meshrefs.rbxm");
        std::fs::write(&dir, &buf).unwrap();
        let refs = extract_mesh_refs(&dir).unwrap();
        let _ = std::fs::remove_file(&dir);
        let find = |c: &str| refs.iter().find(|r| r.class == c).unwrap_or_else(|| panic!("thiếu {c}: {refs:?}"));
        let a = find("MeshPart");
        assert_eq!((a.name.as_str(), a.path.as_str()), ("Cánh", "Root.Cánh"));
        assert_eq!(a.mesh_id.as_deref(), Some("111"));
        assert_eq!(a.texture_id.as_deref(), Some("222"));
        let b = find("SpecialMesh");
        assert_eq!(b.path, "Root.Part.Mesh");
        assert_eq!(b.mesh_id.as_deref(), Some("333"));
        assert_eq!(b.texture_id.as_deref(), Some("444"));
    }

    #[test]
    fn time_format() {
        assert_eq!(format_time(UNIX_EPOCH + Duration::from_secs(1_700_000_000)), "2023-11-14 22:13");
    }

    /// Chạy bằng `cargo test -- --ignored`: giải mã mọi mesh trong cache Studio của máy này.
    #[test]
    #[ignore]
    fn decode_all_studio_cache() {
        let entries = scan_studio_cache();
        assert!(!entries.is_empty(), "không thấy mesh nào trong cache");
        let (mut fails, mut lod, mut tris) = (Vec::new(), 0, 0);
        for e in &entries {
            let bytes = std::fs::read(&e.path).unwrap();
            match decode_mesh(&bytes) {
                Ok(m) => {
                    tris += m.triangle_count();
                    lod += usize::from(m.lod.is_some());
                    assert!(m.vertex_count() > 0 && m.triangle_count() > 0, "{}", e.path.display());
                }
                Err(err) => fails.push(format!("{}: {err}", e.path.display())),
            }
        }
        eprintln!("{} mesh, {} có LOD (đã cắt LOD0), tổng {} tam giác", entries.len(), lod, tris);
        assert!(fails.is_empty(), "{} lỗi:\n{}", fails.len(), fails.join("\n"));
    }
}
