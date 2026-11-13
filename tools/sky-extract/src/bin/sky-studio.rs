//! Sky Extract Studio: giao diện đọc skybox từ file Roblox.
#![windows_subsystem = "windows"]

use std::{
    collections::{HashMap, HashSet},
    io::Read,
    path::{Path, PathBuf},
    sync::mpsc::{self, Receiver, Sender},
    thread,
    time::Duration,
};

use eframe::egui::{
    self, Align, Align2, Color32, CornerRadius, FontData, FontDefinitions, FontFamily, FontId,
    Layout, Margin, Pos2, Rect, RichText, Sense, Stroke, StrokeKind, TextureHandle,
    TextureOptions, Vec2,
};
use serde::Deserialize;
use sky_extract::mesh::{self, CacheEntry, MeshData, MeshRef};
use sky_extract::{extract, Face, SkyInfo};

// ---------- Bảng màu ----------
const BG: Color32 = Color32::from_rgb(13, 15, 20);
const PANEL: Color32 = Color32::from_rgb(20, 23, 30);
const CARD: Color32 = Color32::from_rgb(28, 32, 41);
const CARD_HOVER: Color32 = Color32::from_rgb(36, 41, 53);
const BORDER: Color32 = Color32::from_rgb(44, 50, 63);
const TEXT: Color32 = Color32::from_rgb(230, 233, 240);
const MUTED: Color32 = Color32::from_rgb(140, 148, 165);
const ACCENT: Color32 = Color32::from_rgb(92, 141, 255);
const OK: Color32 = Color32::from_rgb(72, 199, 142);
const WARN: Color32 = Color32::from_rgb(240, 180, 80);
const ERR: Color32 = Color32::from_rgb(240, 98, 98);

/// Vị trí 6 mặt trên lưới hình chữ thập 4×3: (khóa, cột, hàng)
const CROSS: [(&str, usize, usize); 6] = [
    ("SkyboxUp", 1, 0),
    ("SkyboxLf", 0, 1),
    ("SkyboxFt", 1, 1),
    ("SkyboxRt", 2, 1),
    ("SkyboxBk", 3, 1),
    ("SkyboxDn", 1, 2),
];

enum Msg {
    Thumb { id: String, bytes: Vec<u8> },
    Failed { id: String, err: String },
}

/// Thông điệp từ luồng lưu hàng loạt.
enum BatchMsg {
    Progress { done: usize, total: usize, name: String },
    Finished { dir: PathBuf, skies: usize, saved: usize, errors: Vec<String> },
}

struct BatchState {
    done: usize,
    total: usize,
    name: String,
}

#[derive(Clone)]
enum ThumbState {
    Loading,
    Ready,
    Failed(String),
}

#[derive(Clone, Copy, PartialEq)]
enum Tab {
    Skybox,
    Mesh,
}

/// Thông điệp từ luồng nền của tab Mesh.
enum MeshMsg {
    Scanned(Vec<CacheEntry>),
    Refs { path: PathBuf, result: Result<Vec<MeshRef>, String> },
    Decoded { name: String, result: Result<MeshData, String> },
}

#[derive(Clone, Copy, PartialEq)]
enum ListMode {
    Empty,
    Cache,
    Refs,
}

struct MeshState {
    mode: ListMode,
    entries: Vec<CacheEntry>,
    refs: Vec<MeshRef>,
    refs_file: Option<String>,
    selected: Option<usize>,
    current: Option<(String, MeshData)>,
    api_key: String,
    scanning: bool,
    busy: usize,
    error: Option<String>,
    tx: Sender<MeshMsg>,
    rx: Receiver<MeshMsg>,
}

impl MeshState {
    fn new() -> Self {
        let (tx, rx) = mpsc::channel();
        Self {
            mode: ListMode::Empty,
            entries: Vec::new(),
            refs: Vec::new(),
            refs_file: None,
            selected: None,
            current: None,
            api_key: String::new(),
            scanning: false,
            busy: 0,
            error: None,
            tx,
            rx,
        }
    }
}

struct App {
    tab: Tab,
    m: MeshState,
    file: Option<PathBuf>,
    skies: Vec<SkyInfo>,
    selected: usize,
    error: Option<String>,
    status: (String, Color32),
    textures: HashMap<String, TextureHandle>,
    bytes: HashMap<String, Vec<u8>>,
    thumbs: HashMap<String, ThumbState>,
    tx: Sender<Msg>,
    rx: Receiver<Msg>,
    /// Ô chọn của từng Sky (cùng chỉ số với `skies`).
    checked: Vec<bool>,
    batch: Option<BatchState>,
    last_dir: Option<PathBuf>,
    btx: Sender<BatchMsg>,
    brx: Receiver<BatchMsg>,
}

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("Sky Extract Studio")
            .with_inner_size([1180.0, 760.0])
            .with_min_inner_size([860.0, 560.0])
            .with_drag_and_drop(true),
        ..Default::default()
    };
    eframe::run_native(
        "Sky Extract Studio",
        options,
        Box::new(|cc| {
            setup_style(&cc.egui_ctx);
            let mut app = App::new();
            if let Some(arg) = std::env::args().nth(1) {
                app.open(PathBuf::from(arg), &cc.egui_ctx);
            }
            Ok(Box::new(app))
        }),
    )
}

fn setup_style(ctx: &egui::Context) {
    // Phông Segoe UI của Windows để hiển thị đủ dấu tiếng Việt.
    let mut fonts = FontDefinitions::default();
    for (name, file) in [("segoe", "segoeui.ttf"), ("segoe-bold", "segoeuib.ttf")] {
        if let Ok(data) = std::fs::read(format!("C:\\Windows\\Fonts\\{file}")) {
            fonts
                .font_data
                .insert(name.into(), FontData::from_owned(data).into());
        }
    }
    if fonts.font_data.contains_key("segoe") {
        fonts
            .families
            .get_mut(&FontFamily::Proportional)
            .unwrap()
            .insert(0, "segoe".into());
    }
    if fonts.font_data.contains_key("segoe-bold") {
        fonts
            .families
            .insert(FontFamily::Name("bold".into()), vec!["segoe-bold".into(), "segoe".into()]);
    } else {
        let p = fonts.families[&FontFamily::Proportional].clone();
        fonts.families.insert(FontFamily::Name("bold".into()), p);
    }
    ctx.set_fonts(fonts);

    let mut v = egui::Visuals::dark();
    v.panel_fill = PANEL;
    v.window_fill = PANEL;
    v.extreme_bg_color = BG;
    v.override_text_color = Some(TEXT);
    v.selection.bg_fill = ACCENT.linear_multiply(0.35);
    v.selection.stroke = Stroke::new(1.0, ACCENT);
    v.hyperlink_color = ACCENT;
    let r = CornerRadius::same(8);
    for w in [
        &mut v.widgets.noninteractive,
        &mut v.widgets.inactive,
        &mut v.widgets.hovered,
        &mut v.widgets.active,
        &mut v.widgets.open,
    ] {
        w.corner_radius = r;
    }
    v.widgets.inactive.weak_bg_fill = CARD;
    v.widgets.inactive.bg_fill = CARD;
    v.widgets.inactive.bg_stroke = Stroke::new(1.0, BORDER);
    v.widgets.hovered.weak_bg_fill = CARD_HOVER;
    v.widgets.hovered.bg_fill = CARD_HOVER;
    v.widgets.hovered.bg_stroke = Stroke::new(1.0, ACCENT.linear_multiply(0.6));
    v.widgets.active.weak_bg_fill = ACCENT.linear_multiply(0.4);
    v.widgets.noninteractive.bg_stroke = Stroke::new(1.0, BORDER);
    ctx.set_visuals(v);

    ctx.global_style_mut(|s| {
        s.spacing.item_spacing = Vec2::new(8.0, 8.0);
        s.spacing.button_padding = Vec2::new(14.0, 7.0);
        s.text_styles
            .insert(egui::TextStyle::Body, FontId::proportional(14.5));
        s.text_styles
            .insert(egui::TextStyle::Button, FontId::proportional(14.5));
        s.text_styles
            .insert(egui::TextStyle::Small, FontId::proportional(12.0));
    });
}

fn bold(size: f32) -> FontId {
    FontId::new(size, FontFamily::Name("bold".into()))
}

impl App {
    fn new() -> Self {
        let (tx, rx) = mpsc::channel();
        let (btx, brx) = mpsc::channel();
        Self {
            checked: Vec::new(),
            batch: None,
            last_dir: None,
            btx,
            brx,
            tab: Tab::Skybox,
            m: MeshState::new(),
            file: None,
            skies: Vec::new(),
            selected: 0,
            error: None,
            status: ("Sẵn sàng. Kéo thả file vào cửa sổ hoặc bấm “Mở file”.".into(), MUTED),
            textures: HashMap::new(),
            bytes: HashMap::new(),
            thumbs: HashMap::new(),
            tx,
            rx,
        }
    }

    fn open(&mut self, path: PathBuf, ctx: &egui::Context) {
        self.error = None;
        self.selected = 0;
        match extract(&path) {
            Ok(skies) => {
                let n = skies.len();
                self.skies = skies;
                self.checked = vec![true; n];
                self.last_dir = None;
                if n == 0 {
                    self.status = ("Không tìm thấy đối tượng Sky nào trong file.".into(), WARN);
                } else {
                    self.status = (format!("Đã đọc {n} đối tượng Sky. Đang tải ảnh xem trước…"), OK);
                }
                self.fetch_all(ctx);
            }
            Err(e) => {
                self.skies.clear();
                self.error = Some(e.clone());
                self.status = (format!("Lỗi: {e}"), ERR);
            }
        }
        self.file = Some(path);
    }

    fn fetch_all(&mut self, ctx: &egui::Context) {
        let ids: Vec<String> = self
            .skies
            .iter()
            .flat_map(|s| s.faces.iter().filter_map(|f| f.id.clone()))
            .collect::<HashSet<_>>()
            .into_iter()
            .filter(|id| !self.thumbs.contains_key(id))
            .collect();
        if ids.is_empty() {
            return;
        }
        for id in &ids {
            self.thumbs.insert(id.clone(), ThumbState::Loading);
        }
        let tx = self.tx.clone();
        let ctx = ctx.clone();
        thread::spawn(move || {
            fetch_thumbnails(&ids, &tx, &ctx);
        });
    }

    fn poll(&mut self, ctx: &egui::Context) {
        while let Ok(msg) = self.rx.try_recv() {
            match msg {
                Msg::Thumb { id, bytes } => match image::load_from_memory(&bytes) {
                    Ok(img) => {
                        let rgba = img.to_rgba8();
                        let size = [rgba.width() as usize, rgba.height() as usize];
                        let ci = egui::ColorImage::from_rgba_unmultiplied(size, rgba.as_raw());
                        let tex = ctx.load_texture(format!("asset-{id}"), ci, TextureOptions::LINEAR);
                        self.textures.insert(id.clone(), tex);
                        self.bytes.insert(id.clone(), bytes);
                        self.thumbs.insert(id, ThumbState::Ready);
                    }
                    Err(e) => {
                        self.thumbs.insert(id, ThumbState::Failed(format!("Ảnh lỗi: {e}")));
                    }
                },
                Msg::Failed { id, err } => {
                    self.thumbs.insert(id, ThumbState::Failed(err));
                }
            }
            if !self.thumbs.values().any(|t| matches!(t, ThumbState::Loading)) {
                let ok = self.thumbs.values().filter(|t| matches!(t, ThumbState::Ready)).count();
                let total = self.thumbs.len();
                let color = if ok == total { OK } else { WARN };
                self.status = (format!("Đã tải {ok}/{total} ảnh xem trước."), color);
            }
        }
    }

    fn current(&self) -> Option<&SkyInfo> {
        self.skies.get(self.selected)
    }

    fn copy_all(&mut self, ctx: &egui::Context) {
        let Some(sky) = self.current() else { return };
        let mut s = format!("-- {} ({})\n", sky.name, sky.path);
        for f in &sky.faces {
            if let Some(id) = &f.id {
                s.push_str(&format!("{} = \"rbxassetid://{}\"\n", f.key, id));
            }
        }
        ctx.copy_text(s);
        self.status = ("Đã sao chép toàn bộ ID vào clipboard.".into(), OK);
    }

    fn save_images(&mut self) {
        let Some(sky) = self.current().cloned() else { return };
        let Some(dir) = rfd::FileDialog::new()
            .set_title("Chọn thư mục lưu ảnh")
            .pick_folder()
        else {
            return;
        };
        let mut saved = 0;
        let mut errs = Vec::new();
        for f in &sky.faces {
            let Some(id) = &f.id else { continue };
            let Some(bytes) = self.bytes.get(id) else { continue };
            let ext = match image::guess_format(bytes) {
                Ok(image::ImageFormat::Jpeg) => "jpg",
                Ok(image::ImageFormat::WebP) => "webp",
                _ => "png",
            };
            let path = dir.join(format!("{}_{}.{}", f.key, id, ext));
            match std::fs::write(&path, bytes) {
                Ok(_) => saved += 1,
                Err(e) => errs.push(format!("{}: {e}", f.key)),
            }
        }
        self.status = if errs.is_empty() {
            (format!("Đã lưu {saved} ảnh vào {}", dir.display()), OK)
        } else {
            (format!("Lưu {saved} ảnh, lỗi: {}", errs.join("; ")), ERR)
        };
    }

    /// Lưu ảnh của mọi Sky đã chọn, mỗi Sky một thư mục con, chạy ở luồng nền.
    fn start_batch(&mut self, ctx: &egui::Context) {
        let selected: Vec<SkyInfo> = self
            .skies
            .iter()
            .zip(&self.checked)
            .filter(|(_, c)| **c)
            .map(|(s, _)| s.clone())
            .collect();
        if selected.is_empty() {
            return;
        }
        let Some(root) = rfd::FileDialog::new()
            .set_title("Chọn thư mục lưu ảnh hàng loạt")
            .pick_folder()
        else {
            return;
        };
        let cache = self.bytes.clone();
        let tx = self.btx.clone();
        let ctx = ctx.clone();
        self.batch = Some(BatchState { done: 0, total: selected.len(), name: String::new() });
        self.last_dir = None;
        self.status = (format!("Đang lưu {} Sky…", selected.len()), ACCENT);
        thread::spawn(move || run_batch(selected, cache, root, tx, ctx));
    }

    fn poll_batch(&mut self) {
        while let Ok(msg) = self.brx.try_recv() {
            match msg {
                BatchMsg::Progress { done, total, name } => {
                    self.status = (format!("Đang lưu {done}/{total}: {name}"), ACCENT);
                    self.batch = Some(BatchState { done, total, name });
                }
                BatchMsg::Finished { dir, skies, saved, errors } => {
                    self.batch = None;
                    self.status = if errors.is_empty() {
                        (format!("Xong: {saved} ảnh của {skies} Sky → {}", dir.display()), OK)
                    } else {
                        (
                            format!("Xong {saved} ảnh, {} lỗi: {}", errors.len(), errors.join("; ")),
                            WARN,
                        )
                    };
                    self.last_dir = Some(dir);
                }
            }
        }
    }

    fn pick_file(&mut self, ctx: &egui::Context) {
        if let Some(p) = rfd::FileDialog::new()
            .set_title("Mở file Roblox")
            .add_filter("File Roblox", &["rbxm", "rbxl", "rbxmx", "rbxlx"])
            .pick_file()
        {
            self.open(p, ctx);
        }
    }
}

// ---------- Tải ảnh xem trước từ API thumbnails công khai của Roblox ----------

#[derive(Deserialize)]
struct ThumbResp {
    data: Vec<ThumbItem>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ThumbItem {
    target_id: u64,
    state: String,
    image_url: Option<String>,
}

fn fetch_thumbnails(ids: &[String], tx: &Sender<Msg>, ctx: &egui::Context) {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(20))
        .user_agent("sky-extract-studio/0.1")
        .build();
    let mut remaining: Vec<String> = ids.to_vec();
    for attempt in 0..5 {
        if remaining.is_empty() {
            break;
        }
        if attempt > 0 {
            thread::sleep(Duration::from_millis(1500));
        }
        let url = format!(
            "https://thumbnails.roblox.com/v1/assets?assetIds={}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false",
            remaining.join(",")
        );
        let resp: ThumbResp = match agent.get(&url).call().map_err(|e| e.to_string()).and_then(
            |r| r.into_json().map_err(|e| e.to_string()),
        ) {
            Ok(r) => r,
            Err(e) => {
                for id in remaining.drain(..) {
                    let _ = tx.send(Msg::Failed { id, err: format!("Lỗi mạng: {e}") });
                }
                ctx.request_repaint();
                return;
            }
        };
        let mut still = Vec::new();
        for id in &remaining {
            let item = resp.data.iter().find(|d| d.target_id.to_string() == *id);
            match item {
                Some(it) if it.state == "Completed" && it.image_url.is_some() => {
                    let url = it.image_url.clone().unwrap();
                    let msg = match download(&agent, &url) {
                        Ok(bytes) => Msg::Thumb { id: id.clone(), bytes },
                        Err(e) => Msg::Failed { id: id.clone(), err: e },
                    };
                    let _ = tx.send(msg);
                    ctx.request_repaint();
                }
                Some(it) if it.state == "Pending" => still.push(id.clone()),
                Some(it) => {
                    let _ = tx.send(Msg::Failed {
                        id: id.clone(),
                        err: format!("Roblox trả về trạng thái: {}", it.state),
                    });
                }
                None => {
                    let _ = tx.send(Msg::Failed { id: id.clone(), err: "Không có dữ liệu".into() });
                }
            }
        }
        remaining = still;
    }
    for id in remaining {
        let _ = tx.send(Msg::Failed { id, err: "Roblox chưa tạo xong ảnh, thử lại sau".into() });
    }
    ctx.request_repaint();
}

/// Tên thư mục an toàn trên Windows.
fn safe_name(s: &str) -> String {
    let t: String = s
        .chars()
        .map(|c| if "<>:\"/\\|?*".contains(c) || c.is_control() { '_' } else { c })
        .collect();
    let t = t.trim().trim_end_matches('.').to_string();
    if t.is_empty() { "Sky".into() } else { t }
}

fn image_ext(bytes: &[u8]) -> &'static str {
    match image::guess_format(bytes) {
        Ok(image::ImageFormat::Jpeg) => "jpg",
        Ok(image::ImageFormat::WebP) => "webp",
        _ => "png",
    }
}

fn run_batch(
    skies: Vec<SkyInfo>,
    mut cache: HashMap<String, Vec<u8>>,
    root: PathBuf,
    tx: Sender<BatchMsg>,
    ctx: egui::Context,
) {
    // Tải trước các ảnh chưa có trong bộ nhớ.
    let missing: Vec<String> = skies
        .iter()
        .flat_map(|s| s.faces.iter().filter_map(|f| f.id.clone()))
        .filter(|id| !cache.contains_key(id))
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    let mut fetch_err: HashMap<String, String> = HashMap::new();
    if !missing.is_empty() {
        let _ = tx.send(BatchMsg::Progress {
            done: 0,
            total: skies.len(),
            name: format!("tải {} ảnh từ Roblox", missing.len()),
        });
        ctx.request_repaint();
        let (ltx, lrx) = mpsc::channel();
        fetch_thumbnails(&missing, &ltx, &ctx);
        while let Ok(m) = lrx.try_recv() {
            match m {
                Msg::Thumb { id, bytes } => {
                    cache.insert(id, bytes);
                }
                Msg::Failed { id, err } => {
                    fetch_err.insert(id, err);
                }
            }
        }
    }

    let total = skies.len();
    let mut saved = 0;
    let mut errors = Vec::new();
    let mut used = HashSet::new();
    for (i, sky) in skies.iter().enumerate() {
        let _ = tx.send(BatchMsg::Progress { done: i, total, name: sky.name.clone() });
        ctx.request_repaint();
        // Thư mục con theo tên Sky, thêm hậu tố nếu trùng.
        let base = safe_name(&sky.name);
        let mut name = base.clone();
        let mut n = 2;
        while !used.insert(name.to_lowercase()) {
            name = format!("{base}_{n}");
            n += 1;
        }
        let dir = root.join(&name);
        if let Err(e) = std::fs::create_dir_all(&dir) {
            errors.push(format!("{name}: {e}"));
            continue;
        }
        let mut ids = format!("-- {} ({})\n", sky.name, sky.path);
        for f in &sky.faces {
            let Some(id) = &f.id else { continue };
            ids.push_str(&format!("{} = \"rbxassetid://{}\"\n", f.key, id));
            match cache.get(id) {
                Some(bytes) => {
                    let path = dir.join(format!("{}_{}.{}", f.key, id, image_ext(bytes)));
                    match std::fs::write(&path, bytes) {
                        Ok(_) => saved += 1,
                        Err(e) => errors.push(format!("{name}/{}: {e}", f.key)),
                    }
                }
                None => errors.push(format!(
                    "{name}/{}: {}",
                    f.key,
                    fetch_err.get(id).map(String::as_str).unwrap_or("không có ảnh")
                )),
            }
        }
        if let Err(e) = std::fs::write(dir.join("ids.txt"), ids) {
            errors.push(format!("{name}/ids.txt: {e}"));
        }
    }
    let _ = tx.send(BatchMsg::Finished { dir: root, skies: total, saved, errors });
    ctx.request_repaint();
}

fn download(agent: &ureq::Agent, url: &str) -> Result<Vec<u8>, String> {
    let resp = agent.get(url).call().map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    resp.into_reader()
        .take(20 * 1024 * 1024)
        .read_to_end(&mut buf)
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

// ---------- Giao diện ----------

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        self.poll(&ctx);
        self.poll_batch();
        self.poll_mesh(&ctx);

        // Kéo thả file
        let dropped: Vec<PathBuf> = ctx.input(|i| {
            i.raw.dropped_files.iter().map(|f| f.path().to_path_buf()).collect()
        });
        if let Some(p) = dropped.into_iter().next() {
            match self.tab {
                Tab::Skybox => self.open(p, &ctx),
                Tab::Mesh => self.mesh_open(p, &ctx),
            }
        }
        let hovering = ctx.input(|i| !i.raw.hovered_files.is_empty());

        self.top_bar(ui, &ctx);
        self.status_bar(ui);
        match self.tab {
            Tab::Skybox => {
                if !self.skies.is_empty() {
                    self.side_panel(ui, &ctx);
                }
            }
            Tab::Mesh => self.mesh_side_panel(ui, &ctx),
        }
        egui::CentralPanel::default()
            .frame(egui::Frame::NONE.fill(BG).inner_margin(Margin::same(24)))
            .show(ui, |ui| match self.tab {
                Tab::Skybox => {
                    if self.skies.is_empty() {
                        self.empty_state(ui, &ctx, hovering);
                    } else {
                        self.main_view(ui, &ctx);
                    }
                }
                Tab::Mesh => self.mesh_main(ui, &ctx, hovering),
            });

        if hovering && (self.tab == Tab::Mesh || !self.skies.is_empty()) {
            let rect = ctx.content_rect();
            let p = ctx.layer_painter(egui::LayerId::new(
                egui::Order::Foreground,
                egui::Id::unique("drop-overlay"),
            ));
            p.rect_filled(rect, 0, Color32::from_black_alpha(170));
            p.rect_stroke(rect.shrink(16.0), 14, Stroke::new(2.0, ACCENT), StrokeKind::Inside);
            p.text(rect.center(), Align2::CENTER_CENTER, "Thả file để mở", bold(26.0), TEXT);
        }
    }
}

impl App {
    fn top_bar(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        egui::Panel::top("top")
            .frame(
                egui::Frame::NONE
                    .fill(PANEL)
                    .inner_margin(Margin::symmetric(20, 12))
                    .stroke(Stroke::new(1.0, BORDER)),
            )
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    let (r, _) = ui.allocate_exact_size(Vec2::splat(30.0), Sense::hover());
                    logo(ui.painter(), r);
                    ui.add_space(4.0);
                    ui.vertical(|ui| {
                        ui.spacing_mut().item_spacing.y = 0.0;
                        ui.label(RichText::new("Sky Extract Studio").font(bold(17.0)));
                        ui.label(
                            RichText::new(match self.tab {
                                Tab::Skybox => "Trích xuất skybox từ file Roblox",
                                Tab::Mesh => "Giải mã và xuất mesh Roblox",
                            })
                            .size(12.0)
                            .color(MUTED),
                        );
                    });
                    ui.add_space(22.0);
                    for (tab, label) in [(Tab::Skybox, "Skybox"), (Tab::Mesh, "Mesh")] {
                        let sel = self.tab == tab;
                        let btn = egui::Button::new(
                            RichText::new(label)
                                .font(bold(14.0))
                                .color(if sel { Color32::WHITE } else { MUTED }),
                        )
                        .fill(if sel { ACCENT.linear_multiply(0.45) } else { Color32::TRANSPARENT })
                        .stroke(Stroke::new(1.0, if sel { ACCENT } else { BORDER }));
                        if ui.add(btn).clicked() {
                            self.tab = tab;
                        }
                    }
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if self.tab == Tab::Mesh {
                            return;
                        }
                        let btn = egui::Button::new(
                            RichText::new("Mở file…").color(Color32::WHITE).font(bold(14.0)),
                        )
                        .fill(ACCENT);
                        if ui.add(btn).on_hover_text("Ctrl+O").clicked() {
                            self.pick_file(ctx);
                        }
                        if let Some(f) = self.file.clone() {
                            if ui
                                .button("Tải lại")
                                .on_hover_text("Đọc lại file hiện tại")
                                .clicked()
                            {
                                self.open(f.clone(), ctx);
                            }
                            let name = f.file_name().and_then(|n| n.to_str()).unwrap_or("");
                            ui.label(RichText::new(name).color(MUTED))
                                .on_hover_text(f.display().to_string());
                        }
                    });
                });
            });
        if ctx.input_mut(|i| i.consume_key(egui::Modifiers::COMMAND, egui::Key::O)) {
            match self.tab {
                Tab::Skybox => self.pick_file(ctx),
                Tab::Mesh => self.mesh_pick_file(ctx),
            }
        }
    }

    fn status_bar(&mut self, ui: &mut egui::Ui) {
        egui::Panel::bottom("status")
            .frame(
                egui::Frame::NONE
                    .fill(PANEL)
                    .inner_margin(Margin::symmetric(16, 6))
                    .stroke(Stroke::new(1.0, BORDER)),
            )
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    let (r, _) = ui.allocate_exact_size(Vec2::splat(8.0), Sense::hover());
                    ui.painter().circle_filled(r.center(), 4.0, self.status.1);
                    ui.label(RichText::new(&self.status.0).size(12.5).color(MUTED));
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        ui.label(RichText::new("dùng rbx-dom").size(12.0).color(MUTED));
                    });
                });
            });
    }

    fn side_panel(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        egui::Panel::left("side")
            .exact_size(290.0)
            .resizable(false)
            .frame(
                egui::Frame::NONE
                    .fill(PANEL)
                    .inner_margin(Margin::same(16))
                    .stroke(Stroke::new(1.0, BORDER)),
            )
            .show(ui, |ui| {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    let busy = self.batch.is_some();
                    ui.horizontal(|ui| {
                        section_title(ui, &format!("ĐỐI TƯỢNG SKY ({})", self.skies.len()));
                        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                            let mut all = !self.checked.is_empty() && self.checked.iter().all(|c| *c);
                            if ui
                                .add_enabled(!busy, egui::Checkbox::new(&mut all, "Chọn tất cả"))
                                .changed()
                            {
                                self.checked.iter_mut().for_each(|c| *c = all);
                            }
                        });
                    });
                    let mut clicked = None;
                    let mut toggled = None;
                    for (i, sky) in self.skies.iter().enumerate() {
                        let sel = i == self.selected;
                        let mut on = self.checked.get(i).copied().unwrap_or(false);
                        let resp = egui::Frame::NONE
                            .fill(if sel { ACCENT.linear_multiply(0.18) } else { CARD })
                            .stroke(Stroke::new(1.0, if sel { ACCENT } else { BORDER }))
                            .corner_radius(8)
                            .inner_margin(Margin::symmetric(12, 9))
                            .show(ui, |ui| {
                                ui.set_width(ui.available_width());
                                ui.horizontal(|ui| {
                                    if ui
                                        .add_enabled(!busy, egui::Checkbox::without_text(&mut on))
                                        .on_hover_text("Chọn để lưu hàng loạt")
                                        .changed()
                                    {
                                        toggled = Some((i, on));
                                    }
                                    ui.vertical(|ui| {
                                        ui.spacing_mut().item_spacing.y = 2.0;
                                        ui.label(RichText::new(&sky.name).font(bold(14.0)));
                                        ui.label(RichText::new(&sky.path).size(12.0).color(MUTED));
                                        let n = sky.faces[..6].iter().filter(|f| f.id.is_some()).count();
                                        ui.label(
                                            RichText::new(format!("{n}/6 mặt có ảnh"))
                                                .size(12.0)
                                                .color(if n == 6 { OK } else { WARN }),
                                        );
                                    });
                                });
                            })
                            .response
                            .interact(Sense::click());
                        if let Some((ti, v)) = toggled {
                            if ti == i {
                                if let Some(c) = self.checked.get_mut(i) {
                                    *c = v;
                                }
                            }
                        }
                        if resp.clicked() {
                            clicked = Some(i);
                        }
                        if resp.hovered() {
                            ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
                        }
                    }
                    if let Some(i) = clicked {
                        self.selected = i;
                    }

                    ui.add_space(14.0);
                    section_title(ui, "THAO TÁC");
                    let w = ui.available_width();
                    let k = self.checked.iter().filter(|c| **c).count();
                    if let Some(b) = &self.batch {
                        ui.add(
                            egui::ProgressBar::new(b.done as f32 / b.total.max(1) as f32)
                                .desired_width(w)
                                .text(format!("{}/{} · {}", b.done, b.total, b.name)),
                        );
                        ctx.request_repaint_after(Duration::from_millis(100));
                    } else {
                        let btn = egui::Button::new(
                            RichText::new(format!("Lưu hàng loạt ({k} Sky)…"))
                                .color(Color32::WHITE)
                                .font(bold(14.0)),
                        )
                        .fill(ACCENT)
                        .min_size(Vec2::new(w, 36.0));
                        if ui
                            .add_enabled(k > 0, btn)
                            .on_hover_text("Chọn thư mục; mỗi Sky được lưu vào một thư mục con riêng")
                            .on_disabled_hover_text("Chưa chọn Sky nào")
                            .clicked()
                        {
                            self.start_batch(ctx);
                        }
                    }
                    if let Some(dir) = self.last_dir.clone() {
                        if ui
                            .add_sized([w, 32.0], egui::Button::new("📂 Mở thư mục vừa tải"))
                            .on_hover_text(dir.display().to_string())
                            .clicked()
                        {
                            if let Err(e) = std::process::Command::new("explorer").arg(&dir).spawn() {
                                self.status = (format!("Không mở được thư mục: {e}"), ERR);
                            }
                        }
                    }
                    ui.add_space(4.0);
                    if ui
                        .add_sized([w, 34.0], egui::Button::new("Sao chép tất cả ID"))
                        .clicked()
                    {
                        self.copy_all(ctx);
                    }
                    let any_img = self.current().is_some_and(|s| {
                        s.faces.iter().any(|f| f.id.as_ref().is_some_and(|id| self.bytes.contains_key(id)))
                    });
                    if ui
                        .add_enabled(any_img, egui::Button::new("Lưu ảnh xem trước…").min_size(Vec2::new(w, 34.0)))
                        .on_disabled_hover_text("Chưa có ảnh nào tải xong")
                        .clicked()
                    {
                        self.save_images();
                    }

                    ui.add_space(14.0);
                    section_title(ui, "MẶT TRỜI & MẶT TRĂNG");
                    if let Some(sky) = self.current().cloned() {
                        ui.horizontal(|ui| {
                            let size = (ui.available_width() - 8.0) / 2.0;
                            for key in ["SunTexture", "MoonTexture"] {
                                if let Some(f) = sky.face(key) {
                                    self.tile(ui, ctx, f, Vec2::splat(size));
                                }
                            }
                        });
                    }

                    ui.add_space(14.0);
                    egui::Frame::NONE
                        .fill(CARD)
                        .corner_radius(8)
                        .inner_margin(Margin::same(12))
                        .show(ui, |ui| {
                            ui.set_width(ui.available_width());
                            ui.label(RichText::new("Lưu ý").font(bold(13.0)).color(WARN));
                            ui.label(
                                RichText::new(
                                    "Ảnh xem trước lấy từ API thumbnails của Roblox, tối đa 420×420, \
                                     không phải ảnh gốc. Tài nguyên trên Creator Store chỉ được \
                                     cấp phép dùng trong Roblox.",
                                )
                                .size(12.0)
                                .color(MUTED),
                            );
                        });
                });
            });
    }

    fn empty_state(&mut self, ui: &mut egui::Ui, ctx: &egui::Context, hovering: bool) {
        let avail = ui.available_rect_before_wrap();
        let box_size = Vec2::new(avail.width().min(560.0), 300.0);
        let rect = Rect::from_center_size(avail.center(), box_size);
        let resp = ui.interact(rect, egui::Id::unique("dropzone"), Sense::click());
        let p = ui.painter();
        let active = hovering || resp.hovered();
        p.rect(
            rect,
            16,
            if active { ACCENT.linear_multiply(0.08) } else { PANEL },
            Stroke::new(if active { 2.0 } else { 1.0 }, if active { ACCENT } else { BORDER }),
            StrokeKind::Inside,
        );
        let icon = Rect::from_center_size(rect.center() - Vec2::new(0.0, 70.0), Vec2::splat(56.0));
        logo(p, icon);
        p.text(
            rect.center() + Vec2::new(0.0, 0.0),
            Align2::CENTER_CENTER,
            if hovering { "Thả file để mở" } else { "Kéo thả file Roblox vào đây" },
            bold(22.0),
            TEXT,
        );
        p.text(
            rect.center() + Vec2::new(0.0, 32.0),
            Align2::CENTER_CENTER,
            "hoặc bấm để chọn file  ·  .rbxm  .rbxl  .rbxmx  .rbxlx",
            FontId::proportional(14.0),
            MUTED,
        );
        p.text(
            rect.center() + Vec2::new(0.0, 90.0),
            Align2::CENTER_CENTER,
            "Trong Roblox Studio: chuột phải lên Sky → Save to File",
            FontId::proportional(12.5),
            MUTED.linear_multiply(0.8),
        );
        if let Some(err) = &self.error {
            p.text(
                rect.center_bottom() + Vec2::new(0.0, 28.0),
                Align2::CENTER_CENTER,
                err,
                FontId::proportional(13.0),
                ERR,
            );
        }
        if resp.hovered() {
            ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
        }
        if resp.clicked() {
            self.pick_file(ctx);
        }
    }

    fn main_view(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        let Some(sky) = self.current().cloned() else { return };
        ui.horizontal(|ui| {
            ui.vertical(|ui| {
                ui.spacing_mut().item_spacing.y = 2.0;
                ui.label(RichText::new(&sky.name).font(bold(24.0)));
                ui.label(RichText::new(format!("Skybox · {}", sky.path)).color(MUTED));
            });
        });
        ui.add_space(4.0);
        ui.label(
            RichText::new("Bấm vào một mặt để sao chép ID. Bố cục hình chữ thập giống cubemap.")
                .size(12.5)
                .color(MUTED),
        );
        ui.add_space(12.0);

        let avail = ui.available_rect_before_wrap();
        let gap = 10.0;
        let size = ((avail.width() - 3.0 * gap) / 4.0)
            .min((avail.height() - 2.0 * gap) / 3.0)
            .max(60.0);
        let total = Vec2::new(4.0 * size + 3.0 * gap, 3.0 * size + 2.0 * gap);
        let origin = Pos2::new(avail.center().x - total.x / 2.0, avail.top());
        for (key, col, row) in CROSS {
            if let Some(f) = sky.face(key) {
                let min = origin + Vec2::new(col as f32 * (size + gap), row as f32 * (size + gap));
                let rect = Rect::from_min_size(min, Vec2::splat(size));
                let mut child = ui.new_child(egui::UiBuilder::new().max_rect(rect));
                self.tile(&mut child, ctx, f, Vec2::splat(size));
            }
        }
        ui.allocate_rect(Rect::from_min_size(origin, total), Sense::hover());
    }

    /// Ô hiển thị một mặt: ảnh, nhãn, ID. Bấm để sao chép ID.
    fn tile(&mut self, ui: &mut egui::Ui, ctx: &egui::Context, f: &Face, size: Vec2) {
        let (rect, resp) = ui.allocate_exact_size(size, Sense::click());
        let p = ui.painter_at(rect);
        let hovered = resp.hovered() && f.id.is_some();
        p.rect_filled(rect, 10, if hovered { CARD_HOVER } else { CARD });

        let state = f.id.as_ref().and_then(|id| self.thumbs.get(id).cloned());
        let tex = f.id.as_ref().and_then(|id| self.textures.get(id));
        match (&f.id, tex, &state) {
            (Some(_), Some(tex), _) => {
                p.image(
                    tex.id(),
                    rect.shrink(1.0),
                    Rect::from_min_max(Pos2::ZERO, Pos2::new(1.0, 1.0)),
                    Color32::WHITE,
                );
            }
            (Some(_), None, Some(ThumbState::Loading)) => {
                let t = ui.input(|i| i.time) as f32;
                let c = rect.center();
                let r = (size.x * 0.08).clamp(8.0, 18.0);
                for k in 0..8 {
                    let a = t * 6.0 + k as f32 * std::f32::consts::TAU / 8.0;
                    let alpha = (k as f32 + 1.0) / 8.0;
                    p.circle_filled(
                        c + Vec2::angled(a) * r,
                        (r * 0.18).max(2.0),
                        MUTED.linear_multiply(alpha),
                    );
                }
                ctx.request_repaint_after(Duration::from_millis(30));
            }
            (Some(_), None, Some(ThumbState::Failed(_))) => {
                p.text(rect.center(), Align2::CENTER_CENTER, "Không tải được ảnh", FontId::proportional(12.0), ERR);
            }
            (None, _, _) => {
                p.text(
                    rect.center(),
                    Align2::CENTER_CENTER,
                    if f.raw.is_some() { "Không rõ định dạng" } else { "Trống" },
                    FontId::proportional(12.5),
                    MUTED,
                );
            }
            _ => {}
        }

        // Nhãn phía dưới
        let label_h = 40.0_f32.min(size.y * 0.4);
        let band = Rect::from_min_max(Pos2::new(rect.left(), rect.bottom() - label_h), rect.max);
        p.rect_filled(
            band,
            CornerRadius { nw: 0, ne: 0, sw: 10, se: 10 },
            Color32::from_black_alpha(165),
        );
        p.text(
            band.left_top() + Vec2::new(10.0, 5.0),
            Align2::LEFT_TOP,
            f.label,
            bold(12.5),
            TEXT,
        );
        p.text(
            band.left_bottom() + Vec2::new(10.0, -5.0),
            Align2::LEFT_BOTTOM,
            f.id.as_deref().unwrap_or("—"),
            FontId::monospace(11.0),
            MUTED,
        );
        p.rect_stroke(
            rect,
            10,
            Stroke::new(if hovered { 1.5 } else { 1.0 }, if hovered { ACCENT } else { BORDER }),
            StrokeKind::Inside,
        );

        if let Some(id) = &f.id {
            let tip = match &state {
                Some(ThumbState::Failed(e)) => format!("{} · {id}\n{e}\nBấm để sao chép ID", f.key),
                _ => format!("{} · {id}\nBấm để sao chép ID", f.key),
            };
            let resp = resp.on_hover_text(tip);
            if resp.hovered() {
                ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
            }
            if resp.clicked() {
                ctx.copy_text(format!("rbxassetid://{id}"));
                self.status = (format!("Đã sao chép {} (rbxassetid://{id}).", f.key), OK);
            }
        } else if let Some(raw) = &f.raw {
            resp.on_hover_text(raw.clone());
        }
    }
}

// ---------- Tab Mesh ----------

fn human_size(n: u64) -> String {
    let f = n as f64;
    if f >= 1048576.0 {
        format!("{:.1} MB", f / 1048576.0)
    } else if f >= 1024.0 {
        format!("{:.1} KB", f / 1024.0)
    } else {
        format!("{n} B")
    }
}

/// 1234567 -> "1.234.567"
fn group_num(n: usize) -> String {
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push('.');
        }
        out.push(c);
    }
    out
}

fn file_stem(p: &Path) -> String {
    p.file_stem().and_then(|n| n.to_str()).unwrap_or("mesh").to_string()
}

fn stat_card(ui: &mut egui::Ui, title: &str, value: &str, color: Color32) {
    egui::Frame::NONE
        .fill(CARD)
        .stroke(Stroke::new(1.0, BORDER))
        .corner_radius(10)
        .inner_margin(Margin::symmetric(16, 12))
        .show(ui, |ui| {
            ui.set_min_width(150.0);
            ui.spacing_mut().item_spacing.y = 3.0;
            ui.label(RichText::new(title).size(11.5).color(MUTED).strong());
            ui.label(RichText::new(value).font(bold(19.0)).color(color));
        });
}

impl App {
    fn mesh_pick_file(&mut self, ctx: &egui::Context) {
        if let Some(p) = rfd::FileDialog::new()
            .set_title("Mở file .mesh hoặc file Roblox")
            .add_filter("Mesh / Roblox", &["mesh", "rbxm", "rbxl", "rbxmx", "rbxlx"])
            .add_filter("Mọi file", &["*"])
            .pick_file()
        {
            self.mesh_open(p, ctx);
        }
    }

    /// .rbxm/.rbxl/... -> liệt kê MeshRef; file khác -> giải mã mesh.
    fn mesh_open(&mut self, path: PathBuf, ctx: &egui::Context) {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        let fname = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let tx = self.m.tx.clone();
        let ctx = ctx.clone();
        self.m.busy += 1;
        self.m.error = None;
        if matches!(ext.as_str(), "rbxm" | "rbxl" | "rbxmx" | "rbxlx") {
            self.status = (format!("Đang đọc {fname}…"), WARN);
            thread::spawn(move || {
                let result = mesh::extract_mesh_refs(&path);
                let _ = tx.send(MeshMsg::Refs { path, result });
                ctx.request_repaint();
            });
        } else {
            self.status = (format!("Đang giải mã {fname}…"), WARN);
            let name = file_stem(&path);
            thread::spawn(move || {
                let result = std::fs::read(&path)
                    .map_err(|e| format!("Không đọc được file: {e}"))
                    .and_then(|b| mesh::decode_mesh(&b));
                let _ = tx.send(MeshMsg::Decoded { name, result });
                ctx.request_repaint();
            });
        }
    }

    fn mesh_scan(&mut self, ctx: &egui::Context) {
        if self.m.scanning {
            return;
        }
        self.m.scanning = true;
        self.m.error = None;
        self.status = ("Đang quét cache Studio (chỉ đọc)…".into(), WARN);
        let tx = self.m.tx.clone();
        let ctx = ctx.clone();
        thread::spawn(move || {
            let _ = tx.send(MeshMsg::Scanned(mesh::scan_studio_cache()));
            ctx.request_repaint();
        });
    }

    fn mesh_decode_entry(&mut self, i: usize, ctx: &egui::Context) {
        let Some(e) = self.m.entries.get(i) else { return };
        let path = e.path.clone();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("mesh").to_string();
        self.m.selected = Some(i);
        self.m.busy += 1;
        self.m.error = None;
        self.status = (format!("Đang giải mã {name}…"), WARN);
        let tx = self.m.tx.clone();
        let ctx = ctx.clone();
        thread::spawn(move || {
            let result = std::fs::read(&path)
                .map_err(|e| format!("Không đọc được file: {e}"))
                .and_then(|b| mesh::decode_mesh(&b));
            let _ = tx.send(MeshMsg::Decoded { name, result });
            ctx.request_repaint();
        });
    }

    fn mesh_download(&mut self, i: usize, ctx: &egui::Context) {
        let Some(id) = self.m.refs.get(i).and_then(|r| r.mesh_id.clone()) else { return };
        let key = self.m.api_key.clone();
        self.m.selected = Some(i);
        self.m.busy += 1;
        self.m.error = None;
        self.status = (format!("Đang tải asset {id} qua Open Cloud…"), WARN);
        let tx = self.m.tx.clone();
        let ctx = ctx.clone();
        thread::spawn(move || {
            let result = mesh::download_asset(&id, &key).and_then(|b| mesh::decode_mesh(&b));
            let _ = tx.send(MeshMsg::Decoded { name: format!("mesh_{id}"), result });
            ctx.request_repaint();
        });
    }

    fn poll_mesh(&mut self, _ctx: &egui::Context) {
        while let Ok(msg) = self.m.rx.try_recv() {
            match msg {
                MeshMsg::Scanned(v) => {
                    self.m.scanning = false;
                    let n = v.len();
                    self.m.entries = v;
                    self.m.mode = ListMode::Cache;
                    self.m.selected = None;
                    self.status = if n == 0 {
                        ("Không thấy mesh nào trong cache Studio.".into(), WARN)
                    } else {
                        (format!("Tìm thấy {n} mesh trong cache Studio. Bấm một mục để giải mã."), OK)
                    };
                }
                MeshMsg::Refs { path, result } => {
                    self.m.busy = self.m.busy.saturating_sub(1);
                    match result {
                        Ok(refs) => {
                            let n = refs.len();
                            self.m.refs = refs;
                            self.m.refs_file =
                                path.file_name().and_then(|n| n.to_str()).map(str::to_string);
                            self.m.mode = ListMode::Refs;
                            self.m.selected = None;
                            self.status = if n == 0 {
                                ("Không có MeshPart/SpecialMesh nào trong file.".into(), WARN)
                            } else {
                                (format!("Tìm thấy {n} mesh trong file. Nhập API key để tải."), OK)
                            };
                        }
                        Err(e) => {
                            self.m.error = Some(e.clone());
                            self.status = (format!("Lỗi: {e}"), ERR);
                        }
                    }
                }
                MeshMsg::Decoded { name, result } => {
                    self.m.busy = self.m.busy.saturating_sub(1);
                    match result {
                        Ok(m) => {
                            self.status = (
                                format!(
                                    "Đã giải mã {name}: {} đỉnh, {} tam giác.",
                                    group_num(m.vertex_count()),
                                    group_num(m.triangle_count())
                                ),
                                OK,
                            );
                            self.m.current = Some((name, m));
                        }
                        Err(e) => {
                            self.m.error = Some(format!("{name}: {e}"));
                            self.status = (format!("Lỗi {name}: {e}"), ERR);
                        }
                    }
                }
            }
        }
    }

    fn mesh_export(&mut self, obj: bool) {
        let Some((name, _)) = &self.m.current else { return };
        let name = name.clone();
        let (ext, label) = if obj { ("obj", "Wavefront OBJ") } else { ("glb", "glTF Binary") };
        let Some(path) = rfd::FileDialog::new()
            .set_title(format!("Xuất {}", ext.to_uppercase()))
            .set_file_name(format!("{name}.{ext}"))
            .add_filter(label, &[ext])
            .save_file()
        else {
            return;
        };
        let Some((_, m)) = &self.m.current else { return };
        let data = if obj { mesh::to_obj(m).into_bytes() } else { mesh::to_glb(m) };
        self.status = match std::fs::write(&path, &data) {
            Ok(_) => (format!("Đã ghi {} ({}).", path.display(), human_size(data.len() as u64)), OK),
            Err(e) => (format!("Không ghi được file: {e}"), ERR),
        };
    }

    fn mesh_side_panel(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        egui::Panel::left("mside")
            .exact_size(320.0)
            .resizable(false)
            .frame(
                egui::Frame::NONE
                    .fill(PANEL)
                    .inner_margin(Margin::same(16))
                    .stroke(Stroke::new(1.0, BORDER)),
            )
            .show(ui, |ui| {
                let w = ui.available_width();
                section_title(ui, "NGUỒN");
                let open = egui::Button::new(
                    RichText::new("Mở file .mesh / .rbxm…").color(Color32::WHITE).font(bold(14.0)),
                )
                .fill(ACCENT)
                .min_size(Vec2::new(w, 34.0));
                if ui.add(open).on_hover_text("Ctrl+O").clicked() {
                    self.mesh_pick_file(ctx);
                }
                let scan = egui::Button::new(if self.m.scanning { "Đang quét…" } else { "Quét cache Studio" })
                    .min_size(Vec2::new(w, 34.0));
                if ui.add_enabled(!self.m.scanning, scan).clicked() {
                    self.mesh_scan(ctx);
                }

                ui.add_space(10.0);
                section_title(ui, "OPEN CLOUD API KEY");
                ui.add(
                    egui::TextEdit::singleline(&mut self.m.api_key)
                        .password(true)
                        .hint_text("Dán API key để tải mesh theo ID")
                        .desired_width(w),
                );
                ui.label(
                    RichText::new("Key chỉ giữ trong bộ nhớ, không lưu xuống đĩa")
                        .size(12.0)
                        .color(MUTED),
                );

                ui.add_space(10.0);
                let title = match self.m.mode {
                    ListMode::Empty => "DANH SÁCH".to_string(),
                    ListMode::Cache => format!("CACHE STUDIO ({})", self.m.entries.len()),
                    ListMode::Refs => format!("MESH TRONG FILE ({})", self.m.refs.len()),
                };
                section_title(ui, &title);
                if let (ListMode::Refs, Some(f)) = (self.m.mode, &self.m.refs_file) {
                    ui.label(RichText::new(f).size(12.0).color(MUTED));
                }

                let has_key = !self.m.api_key.trim().is_empty();
                let mut pick_entry = None;
                let mut pick_ref = None;
                egui::ScrollArea::vertical().auto_shrink([false, false]).show(ui, |ui| {
                    match self.m.mode {
                        ListMode::Empty => {
                            ui.label(
                                RichText::new("Chưa có gì. Quét cache Studio hoặc mở một file .rbxm.")
                                    .size(12.5)
                                    .color(MUTED),
                            );
                        }
                        ListMode::Cache => {
                            for (i, e) in self.m.entries.iter().enumerate() {
                                let sel = self.m.selected == Some(i);
                                let resp = egui::Frame::NONE
                                    .fill(if sel { ACCENT.linear_multiply(0.18) } else { CARD })
                                    .stroke(Stroke::new(1.0, if sel { ACCENT } else { BORDER }))
                                    .corner_radius(8)
                                    .inner_margin(Margin::symmetric(12, 8))
                                    .show(ui, |ui| {
                                        ui.set_width(ui.available_width());
                                        ui.spacing_mut().item_spacing.y = 2.0;
                                        ui.label(
                                            RichText::new(format!(
                                                "{} · {}",
                                                e.version.replace("version ", "v"),
                                                human_size(e.size)
                                            ))
                                            .font(bold(14.0)),
                                        );
                                        let hash = e
                                            .path
                                            .file_name()
                                            .and_then(|n| n.to_str())
                                            .unwrap_or("")
                                            .chars()
                                            .take(10)
                                            .collect::<String>();
                                        let when = e.modified.map(mesh::format_time).unwrap_or_default();
                                        ui.label(
                                            RichText::new(format!("{when} · {hash}"))
                                                .size(12.0)
                                                .color(MUTED),
                                        );
                                    })
                                    .response
                                    .interact(Sense::click());
                                if resp.hovered() {
                                    ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
                                }
                                if resp.clicked() {
                                    pick_entry = Some(i);
                                }
                            }
                        }
                        ListMode::Refs => {
                            for (i, r) in self.m.refs.iter().enumerate() {
                                let sel = self.m.selected == Some(i);
                                egui::Frame::NONE
                                    .fill(if sel { ACCENT.linear_multiply(0.18) } else { CARD })
                                    .stroke(Stroke::new(1.0, if sel { ACCENT } else { BORDER }))
                                    .corner_radius(8)
                                    .inner_margin(Margin::symmetric(12, 8))
                                    .show(ui, |ui| {
                                        ui.set_width(ui.available_width());
                                        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                                            let can = has_key && r.mesh_id.is_some() && self.m.busy == 0;
                                            let tip = if r.mesh_id.is_none() {
                                                "Không có ID mesh"
                                            } else if !has_key {
                                                "Nhập API key để tải"
                                            } else {
                                                "Tải mesh qua Open Cloud"
                                            };
                                            if ui
                                                .add_enabled(can, egui::Button::new("Tải"))
                                                .on_hover_text(tip)
                                                .on_disabled_hover_text(tip)
                                                .clicked()
                                            {
                                                pick_ref = Some(i);
                                            }
                                            ui.with_layout(Layout::top_down(Align::Min), |ui| {
                                                ui.spacing_mut().item_spacing.y = 2.0;
                                                ui.add(
                                                    egui::Label::new(RichText::new(&r.name).font(bold(14.0)))
                                                        .truncate(),
                                                );
                                                let id = r.mesh_id.as_deref().unwrap_or("—");
                                                ui.add(
                                                    egui::Label::new(
                                                        RichText::new(format!("{} · {id}", r.class))
                                                            .size(12.0)
                                                            .color(MUTED),
                                                    )
                                                    .truncate(),
                                                )
                                                .on_hover_text(&r.path);
                                            });
                                        });
                                    });
                            }
                        }
                    }
                });
                if let Some(i) = pick_entry {
                    self.mesh_decode_entry(i, ctx);
                }
                if let Some(i) = pick_ref {
                    self.mesh_download(i, ctx);
                }
            });
    }

    fn mesh_main(&mut self, ui: &mut egui::Ui, ctx: &egui::Context, hovering: bool) {
        let Some((name, m)) = self.m.current.clone() else {
            self.mesh_empty(ui, ctx, hovering);
            return;
        };
        ui.vertical(|ui| {
            ui.spacing_mut().item_spacing.y = 2.0;
            ui.label(RichText::new(&name).font(bold(24.0)));
            ui.label(RichText::new(format!("Mesh Roblox · {}", m.version)).color(MUTED));
        });
        ui.add_space(14.0);

        let s = m.size();
        let yes_no = |b: bool| if b { ("Có", OK) } else { ("Không", WARN) };
        ui.horizontal_wrapped(|ui| {
            ui.spacing_mut().item_spacing = Vec2::splat(12.0);
            stat_card(ui, "PHIÊN BẢN", m.version.trim_start_matches("version "), TEXT);
            stat_card(ui, "ĐỈNH", &group_num(m.vertex_count()), TEXT);
            stat_card(ui, "TAM GIÁC", &group_num(m.triangle_count()), TEXT);
            stat_card(ui, "KÍCH THƯỚC X × Y × Z", &format!("{:.2} × {:.2} × {:.2}", s[0], s[1], s[2]), TEXT);
            let (t, c) = yes_no(m.normals.is_some());
            stat_card(ui, "NORMAL", t, c);
            let (t, c) = yes_no(m.uvs.is_some());
            stat_card(ui, "UV", t, c);
        });
        if let Some((keep, total)) = m.lod {
            ui.add_space(10.0);
            ui.label(
                RichText::new(format!(
                    "File có nhiều mức LOD: chỉ giữ LOD0 ({} / {} mặt)."
                    , group_num(keep), group_num(total)
                ))
                .size(12.5)
                .color(MUTED),
            );
        }
        ui.add_space(18.0);
        ui.horizontal(|ui| {
            let w = 160.0;
            let obj = egui::Button::new(RichText::new("Xuất OBJ…").color(Color32::WHITE).font(bold(14.0)))
                .fill(ACCENT)
                .min_size(Vec2::new(w, 36.0));
            if ui.add(obj).clicked() {
                self.mesh_export(true);
            }
            if ui.add(egui::Button::new("Xuất GLB…").min_size(Vec2::new(w, 36.0))).clicked() {
                self.mesh_export(false);
            }
        });
        ui.add_space(10.0);
        ui.label(
            RichText::new(
                "Giữ nguyên tọa độ Roblox (Y hướng lên, tay phải). OBJ đảo V của UV cho đúng quy ước OBJ; GLB giữ UV gốc.",
            )
            .size(12.0)
            .color(MUTED),
        );
        if let Some(err) = &self.m.error {
            ui.add_space(10.0);
            ui.label(RichText::new(err).size(12.5).color(ERR));
        }
        let _ = ctx;
    }

    fn mesh_empty(&mut self, ui: &mut egui::Ui, ctx: &egui::Context, hovering: bool) {
        let avail = ui.available_rect_before_wrap();
        let rect = Rect::from_center_size(avail.center(), Vec2::new(avail.width().min(560.0), 300.0));
        let resp = ui.interact(rect, egui::Id::unique("mesh-dropzone"), Sense::click());
        let p = ui.painter();
        let active = hovering || resp.hovered();
        p.rect(
            rect,
            16,
            if active { ACCENT.linear_multiply(0.08) } else { PANEL },
            Stroke::new(if active { 2.0 } else { 1.0 }, if active { ACCENT } else { BORDER }),
            StrokeKind::Inside,
        );
        logo(p, Rect::from_center_size(rect.center() - Vec2::new(0.0, 70.0), Vec2::splat(56.0)));
        p.text(
            rect.center(),
            Align2::CENTER_CENTER,
            if hovering { "Thả file để mở" } else { "Kéo thả mesh hoặc file Roblox vào đây" },
            bold(22.0),
            TEXT,
        );
        p.text(
            rect.center() + Vec2::new(0.0, 32.0),
            Align2::CENTER_CENTER,
            "hoặc bấm để chọn file  ·  .mesh  .rbxm  .rbxl  .rbxmx  .rbxlx",
            FontId::proportional(14.0),
            MUTED,
        );
        p.text(
            rect.center() + Vec2::new(0.0, 90.0),
            Align2::CENTER_CENTER,
            "Hoặc bấm “Quét cache Studio” để lấy mesh Studio đã tải sẵn",
            FontId::proportional(12.5),
            MUTED.linear_multiply(0.8),
        );
        if let Some(err) = &self.m.error {
            p.text(
                rect.center_bottom() + Vec2::new(0.0, 28.0),
                Align2::CENTER_CENTER,
                err,
                FontId::proportional(13.0),
                ERR,
            );
        }
        if resp.hovered() {
            ctx.set_cursor_icon(egui::CursorIcon::PointingHand);
        }
        if resp.clicked() {
            self.mesh_pick_file(ctx);
        }
    }
}

fn section_title(ui: &mut egui::Ui, text: &str) {
    ui.label(RichText::new(text).size(11.5).color(MUTED).strong());
    ui.add_space(2.0);
}

/// Biểu tượng: khối lập phương cách điệu (skybox).
fn logo(p: &egui::Painter, r: Rect) {
    p.rect_filled(r, (r.width() * 0.25) as u8, ACCENT);
    let c = r.center();
    let s = r.width() * 0.26;
    let top = [
        c + Vec2::new(0.0, -s),
        c + Vec2::new(s, -s * 0.5),
        c + Vec2::new(0.0, 0.0),
        c + Vec2::new(-s, -s * 0.5),
    ];
    let stroke = Stroke::new((r.width() * 0.06).max(1.5), Color32::WHITE);
    p.add(egui::Shape::closed_line(top.to_vec(), stroke));
    p.line_segment([c + Vec2::new(-s, -s * 0.5), c + Vec2::new(-s, s * 0.5)], stroke);
    p.line_segment([c + Vec2::new(s, -s * 0.5), c + Vec2::new(s, s * 0.5)], stroke);
    p.line_segment([c, c + Vec2::new(0.0, s)], stroke);
    p.line_segment([c + Vec2::new(-s, s * 0.5), c + Vec2::new(0.0, s)], stroke);
    p.line_segment([c + Vec2::new(s, s * 0.5), c + Vec2::new(0.0, s)], stroke);
}

#[allow(dead_code)]
fn _unused(_: &Path) {}
