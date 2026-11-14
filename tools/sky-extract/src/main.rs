//! sky-extract (dòng lệnh): in ra ID ảnh của mọi Sky trong file Roblox.

use std::{env, path::Path, process::ExitCode};

fn mesh_cmd(input: &str, output: &str) -> ExitCode {
    use sky_extract::mesh::{decode_mesh, to_glb, to_obj};
    let bytes = match std::fs::read(input) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("Lỗi: không đọc được {input}: {e}");
            return ExitCode::FAILURE;
        }
    };
    let m = match decode_mesh(&bytes) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Lỗi: {e}");
            return ExitCode::FAILURE;
        }
    };
    let ext = Path::new(output)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let data = match ext.as_str() {
        "obj" => to_obj(&m).into_bytes(),
        "glb" => to_glb(&m),
        _ => {
            eprintln!("Lỗi: file đầu ra phải là .obj hoặc .glb");
            return ExitCode::from(2);
        }
    };
    if let Err(e) = std::fs::write(output, &data) {
        eprintln!("Lỗi: không ghi được {output}: {e}");
        return ExitCode::FAILURE;
    }
    let s = m.size();
    println!("{}: {} đỉnh, {} tam giác", m.version, m.vertex_count(), m.triangle_count());
    println!("kích thước X×Y×Z: {:.3} × {:.3} × {:.3}", s[0], s[1], s[2]);
    println!(
        "normal: {}, UV: {}{}",
        if m.normals.is_some() { "có" } else { "không" },
        if m.uvs.is_some() { "có" } else { "không" },
        m.lod.map(|(k, t)| format!(", LOD0: {k}/{t} mặt")).unwrap_or_default()
    );
    println!("đã ghi {output} ({} byte)", data.len());
    ExitCode::SUCCESS
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("mesh") {
        return match (args.get(1), args.get(2)) {
            (Some(i), Some(o)) => mesh_cmd(i, o),
            _ => {
                eprintln!("Cách dùng: sky-extract mesh <input.mesh|file cache> <output.obj|output.glb>");
                ExitCode::from(2)
            }
        };
    }
    if args.first().map(String::as_str) == Some("dump") {
        let Some(f) = args.get(1) else {
            eprintln!("Cách dùng: sky-extract dump <file.rbxm|.rbxmx>");
            return ExitCode::from(2);
        };
        return match sky_extract::dump::dump_parts(Path::new(f)) {
            Ok(v) => {
                println!("{v}");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Lỗi: {e}");
                ExitCode::FAILURE
            }
        };
    }
    let Some(arg) = args.first().cloned() else {
        eprintln!("Cách dùng: sky-extract <file.rbxm|.rbxl|.rbxmx|.rbxlx>");
        eprintln!("           sky-extract dump <file.rbxm|.rbxmx>   (in JSON mọi BasePart)");
        eprintln!("           sky-extract mesh <input.mesh|file cache> <output.obj|output.glb>");
        eprintln!("Muốn dùng giao diện, mở sky-studio.exe");
        return ExitCode::from(2);
    };
    let skies = match sky_extract::extract(Path::new(&arg)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Lỗi: {e}");
            return ExitCode::FAILURE;
        }
    };
    if skies.is_empty() {
        eprintln!("Không tìm thấy đối tượng Sky nào trong file.");
        return ExitCode::FAILURE;
    }
    for (i, sky) in skies.iter().enumerate() {
        println!("== Sky #{} \"{}\" ({}) ==", i + 1, sky.name, sky.path);
        for f in &sky.faces {
            match (&f.id, &f.raw) {
                (Some(id), _) => println!(
                    "{:<12} {id:<16} https://create.roblox.com/store/asset/{id}",
                    f.key
                ),
                (None, Some(raw)) => println!("{:<12} (không rõ) {raw}", f.key),
                (None, None) => println!("{:<12} (trống)", f.key),
            }
        }
    }
    ExitCode::SUCCESS
}
