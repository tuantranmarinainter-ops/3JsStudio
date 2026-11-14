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
    Ok(json!({ "parts": parts, "nhanVat": characters(&dom), "lienKet": links(&dom) }))
}

// ---------- nhân vật (Model có Humanoid): diện mạo R6/R15 ----------

fn cframe_json(cf: &rbx_dom_weak::types::CFrame) -> Value {
    let o = &cf.orientation;
    json!({ "pos": vec3(&cf.position), "rot": [vec3(&o.x), vec3(&o.y), vec3(&o.z)] })
}

/// ID asset của thuộc tính tên cho trước; không có thì lấy thuộc tính kiểu Content/ContentId đầu tiên có id.
fn content_id(inst: &Instance, names: &[&str]) -> Option<String> {
    if let Some(id) = id_of(inst, names) {
        return Some(id);
    }
    let mut keys: Vec<&str> = inst.properties.iter().map(|(k, _)| k.as_str()).collect();
    keys.sort_unstable();
    keys.into_iter().find_map(|k| match prop(inst, k) {
        Some(v @ (Variant::Content(_) | Variant::ContentId(_))) => asset_id(&asset_text(v)),
        _ => None,
    })
}

fn int_id(inst: &Instance, name: &str) -> Option<String> {
    match prop(inst, name) {
        Some(Variant::Int64(i)) if *i > 0 => Some(i.to_string()),
        Some(Variant::Int32(i)) if *i > 0 => Some(i.to_string()),
        _ => None,
    }
}

fn attachments(dom: &WeakDom, inst: &Instance) -> Vec<Value> {
    inst.children()
        .iter()
        .filter_map(|&c| dom.get_by_ref(c))
        .filter(|a| a.class == "Attachment")
        .map(|a| {
            let cf = match prop(a, "CFrame") {
                Some(Variant::CFrame(cf)) => cframe_json(cf),
                _ => Value::Null,
            };
            json!({ "ten": a.name, "cframe": cf })
        })
        .collect()
}

fn is_part(inst: &Instance) -> bool {
    matches!(prop(inst, "CFrame"), Some(Variant::CFrame(_))) && matches!(prop(inst, "Size"), Some(Variant::Vector3(_)))
}

fn character_json(dom: &WeakDom, r: Ref, model: &Instance, humanoid: &Instance) -> Value {
    let mut body_colors = Value::Null;
    let (mut shirt, mut pants, mut tshirt) = (None, None, None);
    let mut meshes = Vec::new();
    let mut accessories = Vec::new();
    let mut part_atts = Vec::new();
    // duyệt mọi hậu duệ (tóc/mũ hay nằm trong Folder con), theo thứ tự cây
    let mut all = Vec::new();
    let mut stack: Vec<Ref> = model.children().iter().rev().copied().collect();
    while let Some(c) = stack.pop() {
        let Some(ch) = dom.get_by_ref(c) else { continue };
        all.push(c);
        if !matches!(ch.class.as_str(), "Accessory" | "Hat" | "Accoutrement") {
            stack.extend(ch.children().iter().rev().copied());
        }
    }
    for c in all {
        let Some(ch) = dom.get_by_ref(c) else { continue };
        match ch.class.as_str() {
            "BodyColors" => {
                let mut m = serde_json::Map::new();
                for (key, name) in [("head", "Head"), ("torso", "Torso"), ("leftArm", "LeftArm"), ("rightArm", "RightArm"), ("leftLeg", "LeftLeg"), ("rightLeg", "RightLeg")] {
                    let v = match (prop(ch, &format!("{name}Color3")), prop(ch, &format!("{name}Color"))) {
                        (Some(Variant::Color3(c)), _) => json!([c.r, c.g, c.b]),
                        (_, Some(Variant::BrickColor(b))) => {
                            let c = b.to_color3uint8();
                            json!([f32::from(c.r) / 255.0, f32::from(c.g) / 255.0, f32::from(c.b) / 255.0])
                        }
                        _ => Value::Null,
                    };
                    m.insert(key.to_string(), v);
                }
                body_colors = Value::Object(m);
            }
            "Shirt" => shirt = content_id(ch, &["ShirtTemplate"]),
            "Pants" => pants = content_id(ch, &["PantsTemplate"]),
            "ShirtGraphic" => tshirt = content_id(ch, &["Graphic"]),
            "CharacterMesh" => meshes.push(json!({
                "bodyPart": enum_of(ch, "BodyPart"),
                "meshId": int_id(ch, "MeshId"),
                "baseTextureId": int_id(ch, "BaseTextureId"),
                "overlayTextureId": int_id(ch, "OverlayTextureId"),
            })),
            "Accessory" | "Hat" | "Accoutrement" => {
                let handle = ch.children().iter().filter_map(|&h| dom.get_by_ref(h).map(|i| (h, i))).find(|(_, i)| is_part(i));
                let point = match prop(ch, "AttachmentPoint") {
                    Some(Variant::CFrame(cf)) => cframe_json(cf),
                    _ => Value::Null,
                };
                accessories.push(json!({
                    "ten": ch.name,
                    "class": ch.class,
                    "path": full_path(dom, c),
                    "accessoryType": enum_of(ch, "AccessoryType"),
                    "attachmentPoint": point,
                    "handleRef": handle.map(|(h, _)| format!("{h:?}")),
                    "handlePath": handle.map(|(h, _)| full_path(dom, h)),
                    "attachments": handle.map(|(_, i)| attachments(dom, i)).unwrap_or_default(),
                }));
            }
            _ if is_part(ch) => {
                let a = attachments(dom, ch);
                if !a.is_empty() {
                    part_atts.push(json!({ "part": ch.name, "attachments": a }));
                }
            }
            _ => {}
        }
    }
    // HumanoidDescription (nếu có): mọi thuộc tính số/chuỗi/màu khác rỗng
    let mut desc = Value::Null;
    if let Some(d) = humanoid.children().iter().filter_map(|&c| dom.get_by_ref(c)).find(|i| i.class == "HumanoidDescription") {
        let mut m = serde_json::Map::new();
        let mut keys: Vec<&str> = d.properties.iter().map(|(k, _)| k.as_str()).collect();
        keys.sort_unstable();
        for k in keys {
            let v = match prop(d, k) {
                Some(Variant::Int64(i)) if *i != 0 => json!(i),
                Some(Variant::Int32(i)) if *i != 0 => json!(i),
                Some(Variant::Float32(f)) if *f != 0.0 => json!(f),
                Some(Variant::String(t)) if !t.is_empty() => json!(t),
                Some(Variant::Color3(c)) => json!([c.r, c.g, c.b]),
                _ => continue,
            };
            m.insert(k.to_string(), v);
        }
        desc = Value::Object(m);
    }
    // ref của mọi BasePart hậu duệ (kể cả Handle của phụ kiện) — để tách đúng khi nhiều nhân vật trùng tên/đường dẫn
    let mut part_refs = Vec::new();
    let mut st: Vec<Ref> = model.children().iter().rev().copied().collect();
    while let Some(c) = st.pop() {
        let Some(ch) = dom.get_by_ref(c) else { continue };
        if is_part(ch) {
            part_refs.push(format!("{c:?}"));
        }
        st.extend(ch.children().iter().rev().copied());
    }
    json!({
        "path": full_path(dom, r),
        "ref": format!("{r:?}"),
        "partRefs": part_refs,
        "ten": model.name,
        "rigType": enum_of(humanoid, "RigType"),
        "bodyColors": body_colors,
        "shirt": shirt,
        "pants": pants,
        "tshirt": tshirt,
        "characterMeshes": meshes,
        "accessories": accessories,
        "attachments": part_atts,
        "humanoidDescription": desc,
    })
}

/// Mọi thuộc tính trỏ tới asset khác (kiểu Content/ContentId có id): dùng để gỡ asset bọc ngoài (Shirt → ShirtTemplate, Decal → Texture).
fn links(dom: &WeakDom) -> Vec<Value> {
    let mut out = Vec::new();
    let mut stack = vec![dom.root_ref()];
    while let Some(r) = stack.pop() {
        let Some(inst) = dom.get_by_ref(r) else { continue };
        stack.extend(inst.children().iter().rev().copied());
        let mut keys: Vec<&str> = inst.properties.iter().map(|(k, _)| k.as_str()).collect();
        keys.sort_unstable();
        for k in keys {
            if let Some(v @ (Variant::Content(_) | Variant::ContentId(_))) = prop(inst, k) {
                if let Some(id) = asset_id(&asset_text(v)) {
                    out.push(json!({ "class": inst.class, "ten": inst.name, "prop": k, "id": id }));
                }
            }
        }
    }
    out
}

/// Mọi nhân vật trong file: instance có con trực tiếp là Humanoid.
fn characters(dom: &WeakDom) -> Vec<Value> {
    let mut out = Vec::new();
    let mut stack = vec![dom.root_ref()];
    while let Some(r) = stack.pop() {
        let Some(inst) = dom.get_by_ref(r) else { continue };
        stack.extend(inst.children().iter().rev().copied());
        if let Some(h) = inst.children().iter().filter_map(|&c| dom.get_by_ref(c)).find(|i| i.class == "Humanoid") {
            out.push(character_json(dom, r, inst, h));
        }
    }
    out
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

    #[test]
    fn nhan_vat_r6_co_ao_quan_mau_than() {
        use rbx_dom_weak::types::{CFrame, Color3, Content, Enum, Matrix3, Vector3};
        use rbx_dom_weak::InstanceBuilder;
        let cf = || Variant::CFrame(CFrame::new(Vector3::new(0.0, 1.0, 0.0), Matrix3::identity()));
        let part = |n: &str| InstanceBuilder::new("Part").with_name(n).with_property("CFrame", cf()).with_property("Size", Variant::Vector3(Vector3::new(1.0, 1.0, 1.0)));
        let uri = |s: &str| Variant::Content(Content::from_uri(s));
        let model = InstanceBuilder::new("Model")
            .with_name("NPC")
            .with_child(InstanceBuilder::new("Humanoid").with_property("RigType", Variant::Enum(Enum::from_u32(0))))
            .with_child(part("Head").with_child(InstanceBuilder::new("Attachment").with_name("HatAttachment").with_property("CFrame", cf())))
            .with_child(InstanceBuilder::new("Shirt").with_property("ShirtTemplate", uri("rbxassetid://111")))
            .with_child(InstanceBuilder::new("Pants").with_property("PantsTemplate", uri("http://www.roblox.com/asset/?id=222")))
            .with_child(InstanceBuilder::new("BodyColors").with_property("HeadColor3", Variant::Color3(Color3::new(1.0, 0.5, 0.25))))
            .with_child(InstanceBuilder::new("Accessory").with_name("Hair").with_child(
                part("Handle").with_child(InstanceBuilder::new("Attachment").with_name("HairAttachment").with_property("CFrame", cf())),
            ));
        let dom = WeakDom::new(InstanceBuilder::new("DataModel").with_child(model));
        let nv = characters(&dom);
        assert_eq!(nv.len(), 1);
        let a = &nv[0];
        assert_eq!(a["path"], "NPC");
        assert_eq!(a["partRefs"].as_array().unwrap().len(), 2);
        assert_eq!(a["rigType"], 0);
        assert_eq!(a["shirt"], "111");
        assert_eq!(a["pants"], "222");
        assert!(a["tshirt"].is_null());
        assert_eq!(a["bodyColors"]["head"][1], 0.5);
        assert!(a["bodyColors"]["torso"].is_null());
        assert_eq!(a["accessories"][0]["ten"], "Hair");
        assert_eq!(a["accessories"][0]["handlePath"], "NPC.Hair.Handle");
        assert_eq!(a["accessories"][0]["attachments"][0]["ten"], "HairAttachment");
        assert_eq!(a["attachments"][0]["part"], "Head");
        assert_eq!(a["attachments"][0]["attachments"][0]["ten"], "HatAttachment");
    }
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
