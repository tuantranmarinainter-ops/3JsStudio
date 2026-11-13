//! Thử nghiệm: giải nén mesh Roblox bản 7 (COREMESH v2 = DRACO) và xuất OBJ.
//! cargo run --example draco_probe -- <file cache hoặc .mesh> [out.obj]

use draco_core::{DecoderBuffer, GeometryAttributeType, Mesh, MeshDecoder, PointIndex};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let data = std::fs::read(&args[1]).expect("đọc file");
    let start = find(&data, b"version 7.00").or_else(|| find(&data, b"version 6.00")).expect("không phải mesh v6/v7");
    let m = &data[start..];
    let mut p = 13;
    let mut draco: Option<&[u8]> = None;
    while p + 16 <= m.len() {
        let name = String::from_utf8_lossy(&m[p..p + 8]).trim_end_matches('\0').to_string();
        let ver = u32::from_le_bytes(m[p + 8..p + 12].try_into().unwrap());
        let size = u32::from_le_bytes(m[p + 12..p + 16].try_into().unwrap()) as usize;
        println!("chunk {name} v{ver} size {size}");
        let body = &m[p + 16..(p + 16 + size).min(m.len())];
        if name == "COREMESH" && ver == 2 {
            let len = u32::from_le_bytes(body[0..4].try_into().unwrap()) as usize;
            draco = Some(&body[4..4 + len]);
        }
        p += 16 + size;
    }
    let draco = draco.expect("không có COREMESH v2");
    let mut buf = DecoderBuffer::new(draco);
    let mut mesh = Mesh::new();
    let mut dec = MeshDecoder::new();
    dec.decode(&mut buf, &mut mesh).expect("giải nén DRACO");
    println!("points {} faces {} attrs {}", mesh.num_points(), mesh.num_faces(), mesh.num_attributes());
    for i in 0..mesh.num_attributes() {
        let a = mesh.attribute(i);
        println!(
            " attr {i}: {:?} {:?} x{} stride {} uniq {}",
            a.attribute_type(),
            a.data_type(),
            a.num_components(),
            a.byte_stride(),
            a.size()
        );
    }
    let pos = mesh.named_attribute(GeometryAttributeType::Position).expect("không có Position");
    let read3 = |a: &draco_core::PointAttribute, pt: u32| -> [f32; 3] {
        let idx = a.mapped_index(PointIndex(pt)).0 as usize;
        let stride = a.byte_stride() as usize;
        let off = idx * stride;
        let bytes = a.buffer().data();
        let mut v = [0f32; 3];
        for k in 0..(a.num_components() as usize).min(3) {
            let s = off + k * 4;
            v[k] = f32::from_le_bytes(bytes[s..s + 4].try_into().unwrap());
        }
        v
    };
    let (mut lo, mut hi) = ([f32::MAX; 3], [f32::MIN; 3]);
    for i in 0..mesh.num_points() as u32 {
        let v = read3(pos, i);
        for k in 0..3 {
            lo[k] = lo[k].min(v[k]);
            hi[k] = hi[k].max(v[k]);
        }
    }
    println!("bbox {lo:?} .. {hi:?}");
    if let Some(out) = args.get(2) {
        let uv = mesh.named_attribute(GeometryAttributeType::TexCoord);
        let mut s = String::new();
        for i in 0..mesh.num_points() as u32 {
            let v = read3(pos, i);
            s += &format!("v {} {} {}\n", v[0], v[1], v[2]);
        }
        if let Some(uv) = uv {
            for i in 0..mesh.num_points() as u32 {
                let t = read3(uv, i);
                s += &format!("vt {} {}\n", t[0], 1.0 - t[1]);
            }
        }
        for f in 0..mesh.num_faces() {
            let face = mesh.face(draco_core::FaceIndex(f as u32));
            let [a, b, c] = face.map(|p| p.0 + 1);
            if uv.is_some() {
                s += &format!("f {a}/{a} {b}/{b} {c}/{c}\n");
            } else {
                s += &format!("f {a} {b} {c}\n");
            }
        }
        std::fs::write(out, s).unwrap();
        println!("đã ghi {out}");
    }
}

fn find(h: &[u8], n: &[u8]) -> Option<usize> {
    h.windows(n.len()).position(|w| w == n)
}
