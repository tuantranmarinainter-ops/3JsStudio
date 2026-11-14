//! `sky-extract dump`: liệt kê mọi BasePart trong file model Roblox (CFrame, size, màu, mesh, ảnh vân) dạng JSON.

use std::path::Path;

use rbx_dom_weak::{types::Ref, types::Variant, Instance, WeakDom};
use serde_json::{json, Value};

use crate::{asset_id, asset_text, full_path, get_prop, load};

const MESH_PROPS: &[&str] = &["MeshId", "MeshContent"];
const TEXTURE_PROPS: &[&str] = &["TextureID", "TextureId", "TextureContent"];
const DECAL_PROPS: &[&str] = &["Texture", "TextureContent", "TextureID"];

fn id_of(inst: &Instance, names: &[&str]) -> Option<String> {
    get_prop(inst, names).map(asset_text).and_then(|t| asset_id(&t))
}

fn vec3(v: &rbx_dom_weak::types::Vector3) -> Value {
    json!([v.x, v.y, v.z])
}

fn color_of(inst: &Instance) -> Value {
    let rgb = |r: f32, g: f32, b: f32| json!([r, g, b]);
    for name in ["Color", "Color3uint8", "Color3"] {
        match prop(inst, name) {
            Some(Variant::Color3(c)) => return rgb(c.r, c.g, c.b),
            Some(Variant::Color3uint8(c)) => {
                return rgb(f32::from(c.r) / 255.0, f32::from(c.g) / 255.0, f32::from(c.b) / 255.0);
            }
            _ => {}
        }
    }
    if let Some(Variant::BrickColor(b)) = prop(inst, "BrickColor") {
        let c = b.to_color3uint8();
        return rgb(f32::from(c.r) / 255.0, f32::from(c.g) / 255.0, f32::from(c.b) / 255.0);
    }
    Value::Null
}

fn enum_of(inst: &Instance, name: &str) -> Option<u32> {
    match prop(inst, name) {
        Some(Variant::Enum(e)) => Some(e.to_u32()),
        _ => None,
    }
}

fn f32_of(inst: &Instance, name: &str, default: f32) -> f32 {
    match prop(inst, name) {
        Some(Variant::Float32(f)) => *f,
        Some(Variant::Float64(f)) => *f as f32,
        _ => default,
    }
}

fn part_json(dom: &WeakDom, r: Ref, inst: &Instance) -> Option<Value> {
    let Some(Variant::CFrame(cf)) = prop(inst, "CFrame") else { return None };
    let Some(Variant::Vector3(size)) = prop(inst, "Size") else { return None };
    let o = &cf.orientation;
    let shape = match (inst.class.as_str(), enum_of(inst, "Shape")) {
        ("WedgePart", _) => "Wedge",
        ("CornerWedgePart", _) => "CornerWedge",
        ("TrussPart", _) => "Block",
        (_, Some(0)) => "Ball",
        (_, Some(2)) => "Cylinder",
        (_, Some(3)) => "Wedge",
        (_, Some(4)) => "CornerWedge",
        _ => "Block",
    };
    let mut specials = Vec::new();
    let mut decals = Vec::new();
    let mut color_map: Option<String> = None;
    for &c in inst.children() {
        let Some(ch) = dom.get_by_ref(c) else { continue };
        match ch.class.as_str() {
            "SpecialMesh" | "CylinderMesh" | "BlockMesh" => {
                let scale = match prop(ch, "Scale") {
                    Some(Variant::Vector3(v)) => vec3(v),
                    _ => json!([1, 1, 1]),
                };
                let offset = match prop(ch, "Offset") {
                    Some(Variant::Vector3(v)) => vec3(v),
                    _ => json!([0, 0, 0]),
                };
                specials.push(json!({
                    "meshId": id_of(ch, MESH_PROPS),
                    "textureId": id_of(ch, TEXTURE_PROPS),
                    "scale": scale,
                    "offset": offset,
                    "meshType": match ch.class.as_str() {
                        "CylinderMesh" => Some(4),
                        "BlockMesh" => Some(6),
                        _ => enum_of(ch, "MeshType"),
                    },
                    "class": ch.class,
                }));
            }
            "SurfaceAppearance" => {
                if color_map.is_none() {
                    color_map = id_of(ch, &["ColorMap", "ColorMapContent"]);
                }
            }
            "Decal" | "Texture" => decals.push(json!({
                "class": ch.class,
                "texture": id_of(ch, DECAL_PROPS),
                "face": enum_of(ch, "Face"),
                "transparency": f32_of(ch, "Transparency", 0.0),
                "studsPerTile": [f32_of(ch, "StudsPerTileU", 2.0), f32_of(ch, "StudsPerTileV", 2.0)],
            })),
            _ => {}
        }
    }
    // UnionOperation…: liệt kê thuộc tính CSG (kiểu + số byte); nếu đặt SKY_DUMP_BIN=<thư mục> thì ghi dữ liệu nhị phân ra file.
    let mut csg = serde_json::Map::new();
    if inst.class.ends_with("Operation") {
        let dir = std::env::var("SKY_DUMP_BIN").ok();
        for (k, v) in inst.properties.iter() {
            let name = k.as_str();
            let bytes: Option<Vec<u8>> = match v {
                Variant::BinaryString(b) => Some(<rbx_dom_weak::types::BinaryString as AsRef<[u8]>>::as_ref(b).to_vec()),
                Variant::SharedString(b) => Some(b.data().to_vec()),
                _ => None,
            };
            match bytes {
                Some(b) => {
                    let mut file = Value::Null;
                    if let (Some(d), false) = (&dir, b.is_empty()) {
                        let f = Path::new(d).join(format!("{}_{}.bin", format!("{r:?}").replace(|c: char| !c.is_ascii_digit(), ""), name));
                        if std::fs::write(&f, &b).is_ok() {
                            file = json!(f.to_string_lossy());
                        }
                    }
                    csg.insert(name.to_string(), json!({ "bytes": b.len(), "file": file }));
                }
                None if ["AssetId", "Content", "MeshContent", "MeshId"].contains(&name) || name.contains("Data") => {
                    csg.insert(name.to_string(), json!({ "id": asset_id(&asset_text(v)), "text": asset_text(v).chars().take(80).collect::<String>() }));
                }
                None => {}
            }
        }
        if std::env::var("SKY_DUMP_ALL").is_ok() {
            let names: Vec<String> = inst.properties.iter().map(|(k, v)| format!("{}:{:?}", k.as_str(), v.ty())).collect();
            csg.insert("_all".into(), json!(names));
        }
    }
    let initial = match prop(inst, "InitialSize") {
        Some(Variant::Vector3(v)) => vec3(v),
        _ => Value::Null,
    };
    Some(json!({
        "class": inst.class,
        "name": inst.name,
        "path": full_path(dom, inst.parent()),
        "ref": format!("{r:?}"),
        "cframe": {
            "pos": vec3(&cf.position),
            "rot": [vec3(&o.x), vec3(&o.y), vec3(&o.z)],
        },
        "size": vec3(size),
        "initialSize": initial,
        "color": color_of(inst),
        "material": enum_of(inst, "Material"),
        "transparency": f32_of(inst, "Transparency", 0.0),
        "shape": shape,
        "meshId": id_of(inst, MESH_PROPS),
        "textureId": id_of(inst, TEXTURE_PROPS),
        "colorMap": color_map,
        "specialMeshes": specials,
        "decals": decals,
        "csg": csg,
        "usePartColor": matches!(prop(inst, "UsePartColor"), Some(Variant::Bool(true))),
    }))
}

/// Mọi BasePart trong file (theo thứ tự cây).
pub fn dump_parts(path: &Path) -> Result<Value, String> {
    let dom = load(path)?;
    let mut parts = Vec::new();
    let mut stack = vec![dom.root_ref()];
    while let Some(r) = stack.pop() {
        let Some(inst) = dom.get_by_ref(r) else { continue };
        stack.extend(inst.children().iter().rev().copied());
        if let Some(p) = part_json(&dom, r, inst) {
            parts.push(p);
        }
    }
    Ok(json!({ "parts": parts }))
}

/// Ghi mọi thuộc tính nhị phân (BinaryString/SharedString) khác rỗng của mọi instance ra `<out>/<n>_<Class>_<Prop>.bin`.
/// Dùng cho asset CSG (PartOperationAsset: MeshData, ChildData).
pub fn dump_bins(path: &Path, out: &Path) -> Result<Value, String> {
    let dom = load(path)?;
    std::fs::create_dir_all(out).map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    let mut stack = vec![dom.root_ref()];
    let mut n = 0;
    while let Some(r) = stack.pop() {
        let Some(inst) = dom.get_by_ref(r) else { continue };
        stack.extend(inst.children().iter().rev().copied());
        let mut names: Vec<&str> = inst.properties.iter().map(|(k, _)| k.as_str()).collect();
        names.sort_unstable();
        for name in names {
            let bytes: Vec<u8> = match prop(inst, name) {
                Some(Variant::BinaryString(b)) => <rbx_dom_weak::types::BinaryString as AsRef<[u8]>>::as_ref(b).to_vec(),
                Some(Variant::SharedString(b)) => b.data().to_vec(),
                _ => continue,
            };
            if bytes.is_empty() {
                continue;
            }
            let f = out.join(format!("{n}_{}_{name}.bin", inst.class));
            std::fs::write(&f, &bytes).map_err(|e| e.to_string())?;
            list.push(json!({ "class": inst.class, "name": inst.name, "prop": name, "bytes": bytes.len(), "file": f.to_string_lossy() }));
        }
        n += 1;
    }
    Ok(json!({ "bins": list }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rbx_dom_weak::types::{CFrame, Color3uint8, Content, Matrix3, Vector3};
    use rbx_dom_weak::InstanceBuilder;

    #[test]
    fn dump_round_trip() {
        let part = InstanceBuilder::new("MeshPart")
            .with_name("Dau")
            .with_property("CFrame", Variant::CFrame(CFrame::new(Vector3::new(1.0, 2.0, 3.0), Matrix3::identity())))
            .with_property("Size", Variant::Vector3(Vector3::new(2.0, 2.0, 2.0)))
            .with_property("Color3uint8", Variant::Color3uint8(Color3uint8::new(255, 0, 0)))
            .with_property("MeshId", Variant::Content(Content::from_uri("rbxassetid://777")))
            .with_child(InstanceBuilder::new("Decal").with_property("Texture", Variant::Content(Content::from_uri("rbxassetid://888"))));
        let m = InstanceBuilder::new("Model").with_name("M").with_child(part);
        let dom = WeakDom::new(InstanceBuilder::new("DataModel").with_child(m));
        let mut buf = Vec::new();
        rbx_binary::to_writer(&mut buf, &dom, &dom.root().children().to_vec()).unwrap();
        let p = std::env::temp_dir().join("sky_dump_test.rbxm");
        std::fs::write(&p, &buf).unwrap();
        let v = dump_parts(&p).unwrap();
        let a = &v["parts"][0];
        assert_eq!(a["class"], "MeshPart");
        assert_eq!(a["meshId"], "777");
        assert_eq!(a["decals"][0]["texture"], "888");
        assert_eq!(a["size"][0], 2.0);
        assert_eq!(a["cframe"]["pos"][2], 3.0);
        assert!(a["color"][0].as_f64().unwrap() > 0.99);
    }
}

fn prop<'a>(inst: &'a Instance, name: &str) -> Option<&'a Variant> {
    get_prop(inst, &[name])
}
