//! Đọc file Roblox (.rbxm, .rbxl, .rbxmx, .rbxlx) và lấy ID ảnh của các đối tượng `Sky`.

pub mod mesh;

use std::{fs::File, io::BufReader, path::Path};

use rbx_dom_weak::{types::Ref, types::Variant, Instance, WeakDom};

/// (khóa ngắn, tên hiển thị, các tên thuộc tính có thể gặp: tên cũ và tên mới *Content)
pub const PROPS: [(&str, &str, &[&str]); 8] = [
    ("SkyboxBk", "Sau (Back)", &["SkyboxBk", "SkyboxBackContent"]),
    ("SkyboxDn", "Dưới (Down)", &["SkyboxDn", "SkyboxDownContent"]),
    ("SkyboxFt", "Trước (Front)", &["SkyboxFt", "SkyboxFrontContent"]),
    ("SkyboxLf", "Trái (Left)", &["SkyboxLf", "SkyboxLeftContent"]),
    ("SkyboxRt", "Phải (Right)", &["SkyboxRt", "SkyboxRightContent"]),
    ("SkyboxUp", "Trên (Up)", &["SkyboxUp", "SkyboxUpContent"]),
    ("SunTexture", "Mặt trời", &["SunTextureId", "SunTextureContent"]),
    ("MoonTexture", "Mặt trăng", &["MoonTextureId", "MoonTextureContent"]),
];

#[derive(Clone, Debug)]
pub struct Face {
    pub key: &'static str,
    pub label: &'static str,
    /// Số ID asset, nếu tách được.
    pub id: Option<String>,
    /// Giá trị gốc (dạng debug) khi không tách được ID.
    pub raw: Option<String>,
}

#[derive(Clone, Debug)]
pub struct SkyInfo {
    pub name: String,
    /// Đường dẫn trong cây đối tượng, ví dụ "Lighting.AnimeSky".
    pub path: String,
    /// 8 mục theo thứ tự của `PROPS` (6 mặt + mặt trời + mặt trăng).
    pub faces: Vec<Face>,
}

impl SkyInfo {
    pub fn face(&self, key: &str) -> Option<&Face> {
        self.faces.iter().find(|f| f.key == key)
    }
}

pub fn load(path: &Path) -> Result<WeakDom, String> {
    let file = File::open(path).map_err(|e| format!("Không mở được file: {e}"))?;
    let reader = BufReader::new(file);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "rbxm" | "rbxl" => rbx_binary::from_reader(reader).map_err(|e| e.to_string()),
        "rbxmx" | "rbxlx" => rbx_xml::from_reader_default(reader).map_err(|e| e.to_string()),
        _ => Err("Chỉ hỗ trợ .rbxm, .rbxl, .rbxmx, .rbxlx".into()),
    }
}

pub fn asset_text(value: &Variant) -> String {
    format!("{value:?}")
}

/// Rút số ID từ chuỗi kiểu "rbxassetid://123" hoặc "...?id=123".
pub fn asset_id(text: &str) -> Option<String> {
    for key in ["rbxassetid://", "id="] {
        if let Some(pos) = text.find(key) {
            let digits: String = text[pos + key.len()..]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            if !digits.is_empty() {
                return Some(digits);
            }
        }
    }
    None
}

pub fn get_prop<'a>(inst: &'a Instance, names: &[&str]) -> Option<&'a Variant> {
    inst.properties
        .iter()
        .find(|(k, _)| names.contains(&k.as_str()))
        .map(|(_, v)| v)
}

pub fn find_skies(dom: &WeakDom) -> Vec<Ref> {
    let mut out = Vec::new();
    let mut stack = vec![dom.root_ref()];
    while let Some(r) = stack.pop() {
        if let Some(inst) = dom.get_by_ref(r) {
            if inst.class == "Sky" {
                out.push(r);
            }
            stack.extend(inst.children().iter().rev().copied());
        }
    }
    out
}

pub(crate) fn full_path(dom: &WeakDom, r: Ref) -> String {
    let mut parts = Vec::new();
    let mut cur = r;
    while let Some(inst) = dom.get_by_ref(cur) {
        if cur == dom.root_ref() {
            break;
        }
        parts.push(inst.name.clone());
        cur = inst.parent();
    }
    parts.reverse();
    parts.join(".")
}

pub fn sky_info(dom: &WeakDom, r: Ref) -> SkyInfo {
    let inst = dom.get_by_ref(r).expect("ref hợp lệ");
    let faces = PROPS
        .iter()
        .map(|(key, label, aliases)| {
            let v = get_prop(inst, aliases);
            let text = v.map(asset_text);
            let id = text.as_deref().and_then(asset_id);
            Face {
                key,
                label,
                raw: if id.is_none() { text } else { None },
                id,
            }
        })
        .collect();
    SkyInfo {
        name: inst.name.clone(),
        path: full_path(dom, r),
        faces,
    }
}

/// Đọc file và trả về thông tin mọi Sky bên trong.
pub fn extract(path: &Path) -> Result<Vec<SkyInfo>, String> {
    let dom = load(path)?;
    Ok(find_skies(&dom).into_iter().map(|r| sky_info(&dom, r)).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rbx_dom_weak::types::Content;
    use rbx_dom_weak::InstanceBuilder;

    /// Tạo file mẫu khi đặt biến môi trường SKY_SAMPLE_OUT (dùng để thử giao diện).
    #[test]
    fn write_sample_when_requested() {
        let Ok(out) = std::env::var("SKY_SAMPLE_OUT") else { return };
        let mut sky = InstanceBuilder::new("Sky").with_name("AnimeSky (mẫu)");
        for (_, _, aliases) in PROPS[..6].iter() {
            let uri = "rbxassetid://72835926026092".to_string();
            sky = sky.with_property(aliases[0], Variant::Content(Content::from_uri(uri)));
        }
        let lighting = InstanceBuilder::new("Folder").with_name("Lighting").with_child(sky);
        let dom = WeakDom::new(InstanceBuilder::new("DataModel").with_child(lighting));
        let mut f = std::fs::File::create(out).unwrap();
        rbx_binary::to_writer(&mut f, &dom, &dom.root().children().to_vec()).unwrap();
    }

    #[test]
    fn parses_asset_ids() {
        assert_eq!(asset_id("Content(\"rbxassetid://123\")"), Some("123".into()));
        assert_eq!(asset_id("http://www.roblox.com/asset/?id=456"), Some("456".into()));
        assert_eq!(asset_id("nothing"), None);
    }

    #[test]
    fn round_trip_rbxm() {
        let mut sky = InstanceBuilder::new("Sky").with_name("AnimeSky");
        for (i, (_, _, aliases)) in PROPS[..6].iter().enumerate() {
            let uri = format!("rbxassetid://{}", 1000 + i);
            sky = sky.with_property(aliases[0], Variant::Content(Content::from_uri(uri)));
        }
        let lighting = InstanceBuilder::new("Folder").with_name("Lighting").with_child(sky);
        let dom = WeakDom::new(InstanceBuilder::new("DataModel").with_child(lighting));
        let mut buf = Vec::new();
        let root_children = dom.root().children().to_vec();
        rbx_binary::to_writer(&mut buf, &dom, &root_children).unwrap();

        let back = rbx_binary::from_reader(buf.as_slice()).unwrap();
        let skies = find_skies(&back);
        assert_eq!(skies.len(), 1);
        let info = sky_info(&back, skies[0]);
        assert_eq!(info.name, "AnimeSky");
        assert_eq!(info.path, "Lighting.AnimeSky");
        for (i, f) in info.faces[..6].iter().enumerate() {
            assert_eq!(f.id, Some((1000 + i).to_string()), "{}", f.key);
        }
        assert!(info.faces[6].id.is_none());
    }
}
