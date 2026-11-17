-- tools/roblox-phim.lua — BỘ PHÁT phim trong Roblox Studio (ModuleScript ReplicatedStorage.PhimEp6B.PhatPhim).
-- Dữ liệu: ModuleScript "phim" (mục lục, bảng mảnh, phụ đề, mặt) + một ModuleScript mỗi shot (khung 30 fps), do tools/roblox-phim-nap.lua nạp
-- từ `node tools/roblox-phim.mjs xuat …`. Mỗi khung là HÀM THUẦN của t (giây phim): apply(t) đặt CFrame/cỡ mọi mảnh + camera + mặt + phụ đề.
-- Công tắc (thuộc tính của workspace.PhimEp6B): TuongMotMat, Chay, BatDau (giây phim), Lap, PhuDe, ChuNoi, Mat, GuongAo, AnhSang. Xem docs/handoff/roblox-phim-ep6b.md.
local HttpService = game:GetService("HttpService")
local RS = game:GetService("ReplicatedStorage")
local M = {}
local ORIGIN = CFrame.new(-400, 0, 0)          -- gốc bối cảnh e3-phong trong workspace.BoiCanh_ep6B
local FOLDER = RS:WaitForChild("PhimEp6B")
local MAN, SHOT, PARTS, PLAN = nil, {}, {}, {}
local cfg, gui, cap, title, capScale, titleScale
local lastShot, hidden, culled, envHid = nil, {}, {}, {}
local function ltm(p) p.LocalTransparencyModifier = (hidden[p] or culled[p] or envHid[p]) and 1 or 0 end

local function decode(name)   -- dữ liệu chia nhiều ModuleScript (<tên>, <tên>_2…) vì Source tối đa 200 000 ký tự
  local parts, k = { require(FOLDER:WaitForChild(name)) }, 2
  while FOLDER:FindFirstChild(name .. "_" .. k) do table.insert(parts, require(FOLDER[name .. "_" .. k])); k += 1 end
  return HttpService:JSONDecode(table.concat(parts))
end
local function attr(k, d) local v = cfg and cfg:GetAttribute(k); if v == nil then return d end return v end

function M.load()
  if MAN then return MAN end
  MAN = decode("phim")
  local acc = 0
  for _, s in ipairs(MAN.shots) do SHOT[s.id] = decode(s.id); table.insert(PLAN, { s = s, a = acc }); acc += s.n / 30 end
  M.length = acc
  return MAN
end

function M.config()
  cfg = workspace:FindFirstChild("PhimEp6B")
  if not cfg then cfg = Instance.new("Configuration"); cfg.Name = "PhimEp6B"; cfg.Parent = workspace end
  local D = { TuongMotMat = true, Chay = true, BatDau = MAN.shots[1].t0, Lap = true, PhuDe = true, ChuNoi = true, Mat = true, GuongAo = true, AnhSang = true }
  for k, v in pairs(D) do if cfg:GetAttribute(k) == nil then cfg:SetAttribute(k, v) end end
  return cfg
end

-- dựng Part cho mọi mảnh (một lần). Dạng: B khối, E elip (SpecialMesh Sphere), C trụ (trục X Roblox = trục Y phim), F tấm mặt (Decal mặt +Z)
function M.build()
  M.load(); M.config()
  local F = cfg:FindFirstChild("Manh")
  if F and #F:GetChildren() == #MAN.parts then
    for i, p in ipairs(MAN.parts) do PARTS[i - 1] = F:FindFirstChild(p.n) end
    return F
  end
  if F then F:Destroy() end
  F = Instance.new("Folder"); F.Name = "Manh"
  for i, p in ipairs(MAN.parts) do
    local part = Instance.new("Part"); part.Name = p.n; part.Anchored = true; part.CanCollide = false; part.CanQuery = false; part.CanTouch = false
    part.TopSurface = Enum.SurfaceType.Smooth; part.BottomSurface = Enum.SurfaceType.Smooth
    part.Color = Color3.new(p.c[1], p.c[2], p.c[3]); part.Material = p.neon and Enum.Material.Neon or (p.metal and Enum.Material.Metal or Enum.Material.SmoothPlastic)
    part:SetAttribute("Tr", p.tr or 0); part:SetAttribute("K", p.k)
    if p.k == "E" then local m = Instance.new("SpecialMesh"); m.MeshType = Enum.MeshType.Sphere; m.Parent = part
    elseif p.k == "C" then part.Shape = Enum.PartType.Cylinder
    elseif p.k == "F" then part.CastShadow = false; local d = Instance.new("Decal"); d.Name = "Mat"; d.Face = Enum.NormalId.Back; d.Parent = part end
    part.Transparency = 1; part.CFrame = ORIGIN; part.Parent = F
    PARTS[i - 1] = part
  end
  F.Parent = cfg
  return F
end

local function ui()
  if gui or not game:GetService("RunService"):IsClient() then return end
  local pl = game:GetService("Players").LocalPlayer; if not pl then return end
  gui = Instance.new("ScreenGui"); gui.Name = "PhimEp6B_PhuDe"; gui.IgnoreGuiInset = true; gui.ResetOnSpawn = false
  local function lab(y, sz)
    local l = Instance.new("TextLabel"); l.BackgroundTransparency = 1; l.AnchorPoint = Vector2.new(0.5, 0.5); l.Position = UDim2.fromScale(0.5, y)
    l.Size = UDim2.fromScale(0.9, sz); l.Font = Enum.Font.BuilderSansExtraBold; l.TextScaled = true; l.TextColor3 = Color3.new(1, 1, 1); l.Text = ""
    local s = Instance.new("UIStroke"); s.Thickness = 3; s.Color = Color3.new(0, 0, 0); s.Parent = l
    local u = Instance.new("UIScale"); u.Parent = l; l.Parent = gui; return l, u
  end
  cap, capScale = lab(0.78, 0.075); title, titleScale = lab(0.2, 0.09)
  gui.Parent = pl:WaitForChild("PlayerGui")
end
local function pop(k) k = math.clamp(k, 0, 1); return 0.82 + 0.18 * (1 - (1 - k) ^ 3) end

-- tường che giữa camera ảo (sau gương) và mặt gương: ẩn cục bộ trong shot gương
local function clearOccluders()
  local old = hidden; hidden = {}; for p in pairs(old) do if p.Parent then ltm(p) end end
end
local function hideOccluders(pos, tam)
  local bc = workspace:FindFirstChild("BoiCanh_ep6B"); bc = bc and bc:FindFirstChild("e3-phong"); if not bc then return end
  local target = ORIGIN * Vector3.new(tam[1], tam[2], tam[3])
  local dir = target - pos
  local rp = RaycastParams.new(); rp.FilterType = Enum.RaycastFilterType.Include
  for _ = 1, 20 do
    local inc = {}; for _, d in ipairs(bc:GetDescendants()) do if d:IsA("BasePart") and not hidden[d] then table.insert(inc, d) end end
    rp.FilterDescendantsInstances = inc
    local r = workspace:Raycast(pos, dir, rp); if not r then break end
    if (r.Position - target).Magnitude < 0.35 then break end      -- tới mặt gương thì dừng
    hidden[r.Instance] = true; ltm(r.Instance)
  end
end

-- giây phim t → (shot, khung)
function M.locate(t)
  M.load()
  for _, it in ipairs(PLAN) do local s = it.s; if t < s.t1 - 1e-6 then if t < s.t0 then t = s.t0 end
    return s, math.clamp(math.floor((t - s.t0) * 30 + 1e-4), 0, s.n - 1), t end end
  local s = PLAN[#PLAN].s; return s, s.n - 1, s.t1
end
-- giây của đoạn (0…length, bỏ shot không thuộc phòng) → giây phim
function M.toFilm(x)
  M.load()
  for _, it in ipairs(PLAN) do if x < it.a + it.s.n / 30 then return it.s.t0 + (x - it.a) end end
  return PLAN[#PLAN].s.t1 - 1e-3
end
function M.toClip(t)
  M.load()
  for _, it in ipairs(PLAN) do if t < it.s.t1 then return it.a + math.max(0, t - it.s.t0) end end
  return M.length
end

local Lighting = game:GetService("Lighting")
-- TƯỜNG MỘT MẶT: tường của phim chỉ vẽ mặt trong (FrontSide/BackSide) nên camera đặt NGOÀI tường vẫn nhìn xuyên vào phòng.
-- Part Roblox đặc → ẩn cục bộ (LocalTransparencyModifier) mọi mảnh tường/trần mỏng khi camera ở phía ngoài mặt phẳng của nó (so với tâm phòng).
local ROOM_C = Vector3.new(1.0, 3.0, 1.2)          -- PHONG_DIEM.phong_giua (+y 3), toạ độ gốc env
local walls = nil
local function cullWalls(camPos)
  if not walls then
    walls = {}
    local bc = workspace:FindFirstChild("BoiCanh_ep6B"); bc = bc and bc:FindFirstChild("e3-phong"); if not bc then return end
    for _, d in ipairs(bc:GetDescendants()) do
      if d:IsA("BasePart") then local n = string.lower(d.Name)
        if n:find("tuong") or n:find("tran") or n:find("ceil") or n:find("wall") then
          -- tường đứng: trục dày = trục ngang (X hoặc Z của part) nhỏ hơn; trần/sàn: trục Y
          local sz, cf = d.Size, d.CFrame; local ax, th
          if n:find("tran") or n:find("ceil") then ax, th = cf.UpVector, sz.Y
          elseif math.abs(cf.UpVector.Y) > 0.95 then if sz.X <= sz.Z then ax, th = cf.RightVector, sz.X else ax, th = cf.LookVector, sz.Z end end
          if ax and th < 0.8 then table.insert(walls, { p = d, n = ax }) end end end end
  end
  local on = attr("TuongMotMat", true); local C = ORIGIN * ROOM_C
  for _, w in ipairs(walls) do
    local sc = (C - w.p.Position):Dot(w.n); local cc = (camPos - w.p.Position):Dot(w.n)
    local out = on and (sc * cc < 0) and math.abs(cc) > 0.02
    if out ~= (culled[w.p] or false) then culled[w.p] = out or nil; ltm(w.p) end
  end
end
-- ánh sáng theo shot: đêm trong phim là phòng có đèn (phơi sáng 2,3) → Roblox: trời đêm + ánh sáng môi trường ấm, không để tối đen
local L0
local function light(dem)
  L0 = L0 or { ct = Lighting.ClockTime, amb = Lighting.Ambient, oamb = Lighting.OutdoorAmbient, br = Lighting.Brightness, ex = Lighting.ExposureCompensation }
  if dem then Lighting.ClockTime = 0.5; Lighting.Ambient = Color3.fromRGB(150, 128, 105); Lighting.OutdoorAmbient = Color3.fromRGB(110, 100, 120); Lighting.Brightness = 1; Lighting.ExposureCompensation = 0.5
  else Lighting.ClockTime = 9.5; Lighting.Ambient = L0.amb; Lighting.OutdoorAmbient = L0.oamb; Lighting.Brightness = L0.br; Lighting.ExposureCompensation = L0.ex end
end
function M.apply(t)
  if not PARTS[0] then M.build() end
  local s, f, tt = M.locate(t)
  local d = SHOT[s.id]; local fr = d.fr[f + 1]
  local seen = {}
  for _, r in ipairs(fr.parts) do
    local id = r[1]; local p = PARTS[id]; local info = MAN.parts[id + 1]
    if p then
      seen[id] = true
      local cf = ORIGIN * CFrame.new(r[2], r[3], r[4], r[5], r[6], r[7], r[8])
      local sx, sy, sz = math.max(r[9], 0.05), math.max(r[10], 0.05), math.max(r[11], 0.02)
      if info.k == "C" then p.Size = Vector3.new(sy, sx, sz); p.CFrame = cf * CFrame.Angles(0, 0, math.pi / 2)
      else p.Size = Vector3.new(sx, sy, sz); p.CFrame = cf end
      if info.k == "F" then
        local dc = p:FindFirstChild("Mat"); local face = r[12] and MAN.faces[tostring(r[12])]
        if dc then if attr("Mat", true) and face then dc.Texture = "rbxassetid://" .. face; dc.Transparency = 0 else dc.Transparency = 1 end end
        p.Transparency = 1
      else p.Transparency = info.tr or 0; p.CastShadow = true end
    end
  end
  for id, p in pairs(PARTS) do if not seen[id] then p.Transparency = 1; p.CastShadow = false; local dc = p:FindFirstChild("Mat"); if dc then dc.Transparency = 1 end end end
  -- camera (thuần theo khung); shot gương: camera ảo phản chiếu qua mặt gương (Roblox không có gương thật)
  local cam = workspace.CurrentCamera; cam.CameraType = Enum.CameraType.Scriptable
  local c = fr.cam
  if s.guong and fr.camG and attr("GuongAo", true) and s.goc ~= 26 then
    local g = fr.camG; local pos = ORIGIN * Vector3.new(g[1], g[2], g[3])
    cam.CFrame = CFrame.lookAt(pos, pos + Vector3.new(g[4], g[5], g[6]), Vector3.new(g[7], g[8], g[9]))
    if lastShot ~= s.id then clearOccluders(); hideOccluders(pos, d.guongMat.tam) end
  else
    if lastShot ~= s.id then clearOccluders() end
    cam.CFrame = ORIGIN * CFrame.new(c[1], c[2], c[3], c[4], c[5], c[6], c[7])
  end
  cam.FieldOfView = c[8]
  -- ánh sáng theo shot (sáng / đêm)
  if attr("AnhSang", true) and lastShot ~= s.id then light(s.dem) end
  if lastShot ~= s.id then   -- vật bối cảnh phim ẩn trong shot này (thay bằng đồ cốt truyện)
    local old = envHid; envHid = {}
    local bc = workspace:FindFirstChild("BoiCanh_ep6B"); bc = bc and bc:FindFirstChild("e3-phong")
    if bc and d.an then local S = {}; for _, x in ipairs(d.an) do S[x] = true end
      for _, q in ipairs(bc:GetDescendants()) do if q:IsA("BasePart") and (S[q.Name] or (q.Parent and S[q.Parent.Name])) then envHid[q] = true end end end
    for q in pairs(old) do ltm(q) end; for q in pairs(envHid) do ltm(q) end
  end
  cullWalls(cam.CFrame.Position)
  lastShot = s.id
  -- phụ đề + chữ nổi (giống overlay của trang phim: cụm đầu tiên chứa t, nảy 0,12 s)
  ui()
  if cap then
    local txt, k = "", 1
    if attr("PhuDe", true) then for _, L in ipairs(MAN.captions) do if L[1] <= tt + 1e-4 and tt < L[2] then txt = L[3]; k = (tt - L[1]) / 0.12; break end end end
    cap.Text = txt; capScale.Scale = pop(k)
    local tx = ""; if attr("ChuNoi", true) then for _, L in ipairs(MAN.texts or {}) do if L[1] <= tt and tt < L[2] then tx = L[3]; k = (tt - L[1]) / 0.15 end end end
    title.Text = tx; titleScale.Scale = pop(k)
  end
  if cfg then cfg:SetAttribute("ThoiGian", math.floor(tt * 1000) / 1000) end
  return s.id, f
end

-- đo để so với phim (tools/roblox-phim.mjs so): mỗi mục {t, cam{p,f,fov}, parts{tên: tâm}} — toạ độ gốc env
function M.kiem(list)
  local out = {}
  local inv = ORIGIN:Inverse()
  for key, it in pairs(list) do
    M.apply(it.t)
    local cam = workspace.CurrentCamera
    local cp = inv * cam.CFrame.Position; local cf = inv * (cam.CFrame.Position + cam.CFrame.LookVector * 10)
    local parts = {}
    for _, nm in ipairs(it.names) do local p = cfg.Manh:FindFirstChild(nm); if p and p.Transparency < 1 then local v = inv * p.Position; parts[nm] = { v.X, v.Y, v.Z } end end
    out[key] = { cam = { p = { cp.X, cp.Y, cp.Z }, f = { cf.X, cf.Y, cf.Z }, fov = cam.FieldOfView }, parts = parts }
  end
  return HttpService:JSONEncode(out)
end

-- vòng phát (LocalScript gọi): Chay/BatDau/Lap đọc mỗi khung; đổi BatDau = nhảy tới giây đó
function M.run()
  M.build()
  local RunService = game:GetService("RunService")
  local x0, c0, b0 = M.toClip(attr("BatDau", 0)), os.clock(), attr("BatDau", 0)
  local paused = nil
  RunService:BindToRenderStep("PhimEp6B", Enum.RenderPriority.Camera.Value + 1, function()
    local b = attr("BatDau", 0)
    if b ~= b0 then b0 = b; x0 = M.toClip(b); c0 = os.clock(); paused = nil end
    local x
    if attr("Chay", true) then
      if paused then x0 = paused; c0 = os.clock(); paused = nil end
      x = x0 + (os.clock() - c0)
      if x >= M.length then if attr("Lap", true) then x0 = 0; c0 = os.clock(); x = 0 else x = M.length - 1e-3 end end
    else paused = paused or (x0 + (os.clock() - c0)); x = paused end
    M.apply(M.toFilm(x))
  end)
end

return M
