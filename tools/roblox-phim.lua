-- tools/roblox-phim.lua — BỘ PHÁT phim trong Roblox Studio (ModuleScript ReplicatedStorage.PhimEp6B.PhatPhim).
-- Dữ liệu: ModuleScript "phim" (mục lục, bảng mảnh, phụ đề, mặt) + một ModuleScript mỗi shot (khung 30 fps), do tools/roblox-phim-nap.lua nạp
-- từ `node tools/roblox-phim.mjs xuat …`. Mỗi khung là HÀM THUẦN của t (giây phim): apply(t) đặt CFrame/cỡ mọi mảnh + camera + mặt + phụ đề.
-- Công tắc (thuộc tính của workspace.PhimEp6B): NhanVatGoc, NhanVatRoblox, MatPhim, MauGoc, XoayNhap, GauMau, TuongMotMat, Chay, BatDau (giây phim), Lap, PhuDe, ChuNoi, Mat, GuongAo, AnhSang. Xem docs/handoff/roblox-phim-ep6b.md.
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
  local D = { NhanVatGoc = true, TuongMotMat = true, Chay = true, BatDau = MAN.shots[1].t0, Lap = true, PhuDe = true, ChuNoi = true, Mat = true, GuongAo = true, AnhSang = true, MauGoc = true, XoayNhap = true, GauMau = false, NhanVatRoblox = true, MatPhim = true }
  for k, v in pairs(D) do if cfg:GetAttribute(k) == nil then cfg:SetAttribute(k, v) end end
  return cfg
end

-- dựng Part cho mọi mảnh (một lần). Dạng: B khối, E elip (SpecialMesh Sphere), C trụ (trục X Roblox = trục Y phim), F tấm mặt (Decal mặt +Z)
function M.build()
  M.load(); M.config()
  local F = cfg:FindFirstChild("Manh")
  local ok = F and #F:GetChildren() == #MAN.parts
  if ok then for _, p in ipairs(MAN.parts) do if not F:FindFirstChild(p.n) then ok = false; break end end end
  if ok then
    for i, p in ipairs(MAN.parts) do PARTS[i - 1] = F:FindFirstChild(p.n) end
    M.goc(); return F
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
  M.goc()
  return F
end

-- NHÂN VẬT GỐC: MeshPart nhập từ .glb (tools/roblox-nhan-vat.mjs → 3D Importer: model nvNN_<vai> chứa model <mảnh>_Node chứa MeshPart <mảnh>, <mảnh>2…
-- vì Studio tách một mảnh nhiều chất liệu thành nhiều MeshPart). Hiệu chỉnh: khung mảnh = xoay của MeshPart con + tâm hộp hợp của chúng;
-- mỗi MeshPart con giữ độ lệch + cỡ so với khung mảnh (quy về cỡ nghỉ trong nhan-vat.json) → bộ phát đặt theo khung + tỉ lệ cỡ.
-- GẤU KẺ CẮP (nv01 Bắp, nv14 nơ đỏ, nv15 nơ vàng): nhân bản model có xương Tap3_NhomA.NhomB.bap, đặt nguyên khối theo mảnh thân (tâm + hướng), cỡ theo chiều cao gấu phim.
-- Công tắc NhanVatGoc tắt → về khối Part.
local MESH, BEAR, NV = {}, {}, nil
local RB = {}
local RBMAP = { nv02_bach = "bach", nv09_bachF = "bach", nv03_kid2 = "be_vang", nv04_baker = "banh", nv05_tailor = "may",
  nv06_folk1 = "dan_01", nv07_folk2 = "dan_14", nv08_folk3 = "dan_15", nv11_mayorD = "mayor", nv12_guardA = "linh", nv13_guardB = "linh" }
local LIMB = { Torso = "0_0_0_0", Head = "0_0_0_1_0", ["Left Arm"] = "0_0_0_2_0", ["Right Arm"] = "0_0_0_3_0", ["Left Leg"] = "0_0_1_0", ["Right Leg"] = "0_0_2_0" }
local GAU = { nv01_bap = "#2a3fb0", nv14_bearR = "#c0302a", nv15_bearY = "#e8b830" }
-- 3D Importer (đo 17/11 trên 13 vai): NƯỚNG xoay nghỉ Q của node vào lưới (MeshSize = hộp lưới đã xoay) và đặt MeshPart thẳng trục model, quay 180° quanh trục đứng
-- (mặt ±X/±Z của 77 hộp đều lật). → khung node = khung MeshPart · Rπ · Q; cỡ đúng = MeshSize (tỉ lệ 1, lần dựng trước có thể đã kéo méo). Công tắc XoayNhap.
local function nodeFrame(parts, rest, q4)
  for _, q in ipairs(parts) do local ms = q.MeshSize; if ms.Magnitude > 1e-4 then q.Size = ms end end
  local R0 = parts[1].CFrame.Rotation; local inv = R0:Inverse()
  local mn, mx = Vector3.new(1e9, 1e9, 1e9), Vector3.new(-1e9, -1e9, -1e9)
  for _, q in ipairs(parts) do local h = q.Size / 2
    for i = 0, 7 do local c = q.CFrame * Vector3.new((i % 2 == 0) and -h.X or h.X, (i % 4 < 2) and -h.Y or h.Y, (i < 4) and -h.Z or h.Z)
      local l = inv * c; mn = mn:Min(l); mx = mx:Max(l) end end
  local C = CFrame.identity
  if attr("XoayNhap", true) then C = CFrame.Angles(0, math.pi, 0); if q4 then C = C * CFrame.new(0, 0, 0, q4[1], q4[2], q4[3], q4[4]) end end
  return CFrame.new(R0 * ((mn + mx) / 2)) * (R0 * C), rest or (mx - mn)   -- tâm = tâm hộp lưới (lưới xuất đã đặt tâm hộp ở gốc node; hộp đối xứng nên xoay không dời tâm)
end
M.nodeFrame = nodeFrame
-- hệ số co giãn theo trục node (k) → theo trục mảnh, với rot = xoay mảnh trong khung node: kp_i = Σ_j R_ji²·k_j (k đều → giữ nguyên; trục vuông → hoán vị)
local function axisK(rot, k, nguoc)
  local c = { rot.RightVector, rot.UpVector, -rot.LookVector }   -- cột R (trục mảnh viết trong khung node)
  local kv = { k.X, k.Y, k.Z }; local o = { 0, 0, 0 }
  for i = 1, 3 do local v = { c[i].X, c[i].Y, c[i].Z } for j = 1, 3 do if nguoc then o[j] += v[j] ^ 2 * kv[i] else o[i] += v[j] ^ 2 * kv[j] end end end
  return Vector3.new(o[1], o[2], o[3])
end
M.axisK = axisK
-- vị trí/hướng CHÍNH XÁC của MeshPart con so với khung node, tính từ đỉnh lưới .glb (nhan-vat.json pc = tâm hộp primitive sau khi xoay Q):
-- MeshPart nằm ở tâm hộp lưới đã nướng Rπ·Q → off = (Q⁻¹·c, Q⁻¹·Rπ⁻¹). Không phụ thuộc trạng thái hiện tại của mảnh (tránh lệch dồn).
local RPI_INV = CFrame.Angles(0, math.pi, 0):Inverse()
function M.subOff(info, q, key)
  if not (info and info.pc and attr("XoayNhap", true)) then return nil end
  local idx = tonumber(q.Name:sub(#key + 1)) or 1; local c = info.pc[idx]; if not c then return nil end
  local q4 = info.q; local Qi = CFrame.new(0, 0, 0, q4[1], q4[2], q4[3], q4[4]):Inverse()
  return CFrame.new(Qi * Vector3.new(c[1], c[2], c[3])) * Qi * RPI_INV
end
function M.aabb(m)   -- hộp thế giới của các mảnh nhìn thấy (bỏ RootPart)
  local mn, mx = Vector3.new(1e9, 1e9, 1e9), Vector3.new(-1e9, -1e9, -1e9)
  for _, q in ipairs(m:GetDescendants()) do if q:IsA("BasePart") and q.Name ~= "RootPart" then local h = q.Size / 2
    for k = 0, 7 do local c = q.CFrame * Vector3.new((k % 2 == 0) and -h.X or h.X, (k % 4 < 2) and -h.Y or h.Y, (k < 4) and -h.Z or h.Z); mn = mn:Min(c); mx = mx:Max(c) end end end
  return mn, mx
end
function M.setK(b, k)   -- đổi cỡ gấu nhân bản theo hệ số k so với lưới nghỉ; restInv = nghịch (vị trí*k, xoay) của mảnh thân lúc nghỉ
  if b.k and math.abs(b.k - k) < 1e-4 then return end
  b.m:ScaleTo(b.s0 * k)   -- co giãn quanh gốc (đáy giữa) nên gốc giữ nguyên
  local t, q = b.body.t, b.body.q; b.restInv = (CFrame.new(t[1] * k, t[2] * k, t[3] * k) * CFrame.new(0, 0, 0, q[1], q[2], q[3], q[4])):Inverse(); b.k = k
end
function M.goc()
  MESH, BEAR = {}, {}; M.soMesh = 0
  if not attr("NhanVatGoc", true) then return 0 end
  if not NV then local ok, v = pcall(decode, "nhanvat"); NV = ok and v or {} end
  local idOf = {}; for i, p in ipairs(MAN.parts) do idOf[p.n] = i - 1 end
  local n = 0
  for _, m in ipairs(workspace:GetChildren()) do
    local vai = m:IsA("Model") and m.Name:match("^(nv%d%d_%w+)$")
    if vai and not (GAU[vai] and attr("GauMau", false)) and not (RBMAP[vai] and attr("NhanVatRoblox", true)) then   -- gấu: mặc định dùng .glb xuất từ phim như mọi vai (người dùng chốt 17/11); GauMau = bản nhân bản model gấu có sẵn
      for _, nd in ipairs(m:GetDescendants()) do
        local key = nd:IsA("Model") and nd.Name:match("^(.+)_Node$")
        local id = key and idOf[key]; local info = key and NV[key]
        if info and info.col and attr("MauGoc", true) then   -- 3D Importer bỏ màu phẳng (mảnh không vân thành xám) → tô lại theo chất liệu phim; MeshPart <key>, <key>2… = primitive 1, 2…
          for _, q in ipairs(nd:GetChildren()) do if q:IsA("MeshPart") and q.Name:sub(1, #key) == key then
            local c = info.col[tonumber(q.Name:sub(#key + 1)) or 1]; if type(c) == "string" and q.TextureID == "" then q.Color = Color3.fromHex(c) end end end
        end
        if id and info then
          local parts = {}; for _, q in ipairs(nd:GetChildren()) do if q:IsA("MeshPart") then table.insert(parts, q); q.Anchored = true; q.CanCollide = false; q.CanQuery = false; q.CanTouch = false end end
          if #parts > 0 then
            local rest = Vector3.new(info.s[1], info.s[2], info.s[3]); local F, sz = nodeFrame(parts, rest, info.q)
            local k = Vector3.new(sz.X / math.max(rest.X, 1e-4), sz.Y / math.max(rest.Y, 1e-4), sz.Z / math.max(rest.Z, 1e-4))   -- cỡ hiện tại / cỡ nghỉ
            local g = { rest = rest, subs = {} }
            for _, q in ipairs(parts) do local off = M.subOff(info, q, key); if off then q.Size = q.MeshSize; k = Vector3.one else off = F:Inverse() * q.CFrame end
              local kp = axisK(off.Rotation, k)
              table.insert(g.subs, { p = q, pos = off.Position / k, rot = off.Rotation, size = q.Size / kp }) end
            MESH[id] = g; n += 1
          end
        end
      end
    end
  end
  -- gấu: nhân bản model có xương
  local src = workspace:FindFirstChild("Tap3_NhomA"); src = src and src:FindFirstChild("NhomB"); src = src and src:FindFirstChild("bap")
  local fold = cfg:FindFirstChild("Gau") or Instance.new("Folder"); fold.Name = "Gau"; fold.Parent = cfg
  for vai, bow in pairs(attr("GauMau", false) and GAU or {}) do
    local body = NV[vai .. "__0_0_0_0"]; local id = idOf[vai .. "__0_0_0_0"]
    if src and body then
      local cl = fold:FindFirstChild(vai)
      if not cl then cl = src:Clone(); cl.Name = vai; for _, d in ipairs(cl:GetDescendants()) do if d:IsA("BasePart") then d.Anchored = true; d.CanCollide = false; d.CanQuery = false end; if d:IsA("Script") or d:IsA("LocalScript") then d:Destroy() end end
        local no = cl:FindFirstChild("no-gau-2.001"); if no then no.Color = Color3.fromHex(bow); no.TextureID = "" end
        -- cao như gấu phim: hộp hợp các node gấu lúc nghỉ
        local lo, hi = 1e9, -1e9; for k2, v in pairs(NV) do if k2:sub(1, #vai + 2) == vai .. "__" then lo = math.min(lo, v.t[2] - v.s[2] / 2); hi = math.max(hi, v.t[2] + v.s[2] / 2) end end
        local mn0, mx0 = M.aabb(cl); cl:ScaleTo(cl:GetScale() * (hi - lo) / (mx0.Y - mn0.Y))   -- đo phần NHÌN THẤY (bỏ RootPart vô hình)
        local mn1, mx1 = M.aabb(cl); cl.WorldPivot = CFrame.new((mn1.X + mx1.X) / 2, mn1.Y, (mn1.Z + mx1.Z) / 2)   -- gốc = đáy giữa, trục thế giới (ScaleTo giữ gốc)
        cl:SetAttribute("Cao", hi - lo); cl:SetAttribute("S0", cl:GetScale()); cl.Parent = fold end
      -- lưới .glb chưa nhân cỡ gốc (phim thu gấu ×~0,62 ở c.root) → cỡ thật lấy từng khung theo mảnh thân: k = cỡ khung / cỡ lưới (setK)
      BEAR[vai] = { m = cl, body = body, id = id, s0 = cl:GetAttribute("S0") or cl:GetScale(), k = nil }
      M.setK(BEAR[vai], 1)
    end
  end
  M.soMesh = n
  M.rbBuild(idOf)
  return n
end

-- ===== NHÂN VẬT ROBLOX (17/11, người dùng chốt): vai phim → model R6 trong workspace.Tap3_NhomA.NhanVat =====
-- Mỗi khung: Torso/Head/tay/chân đặt theo node bộ phận tương ứng của phim (L = N_phim · D, D tính lúc nghỉ sao cho thân trùng thân,
-- các khớp giữ đúng tư thế nghỉ của rig Roblox); phụ kiện (tóc, mũ, kính…) đi theo bộ phận gần nhất. Mặt: decal mặt phim (MatPhim).
-- Gà, thị trưởng ngủ, 3 gấu: giữ .glb (chờ model). Công tắc NhanVatRoblox (tắt = quay về .glb).
local RPI = CFrame.Angles(0, math.pi, 0)
local R6STD = { Torso = CFrame.identity, Head = CFrame.new(0, 1.5, 0), ["Left Arm"] = CFrame.new(-1.5, 0, 0), ["Right Arm"] = CFrame.new(1.5, 0, 0), ["Left Leg"] = CFrame.new(-0.5, -2, 0), ["Right Leg"] = CFrame.new(0.5, -2, 0) }
M.RB = RB; M.RBMAP = RBMAP
local function nodeRest(v) local q = v.q; return CFrame.new(v.t[1], v.t[2], v.t[3]) * CFrame.new(0, 0, 0, q[1], q[2], q[3], q[4]) end
function M.rbBuild(idOf)
  RB = {}; M.RB = RB
  if not attr("NhanVatRoblox", true) then return end
  local src = workspace:FindFirstChild("Tap3_NhomA"); src = src and src:FindFirstChild("NhanVat"); if not src then return end
  local fold = cfg:FindFirstChild("RB") or Instance.new("Folder"); fold.Name = "RB"; fold.Parent = cfg
  for vai, ten in pairs(RBMAP) do
    local cl = fold:FindFirstChild(vai)
    if not cl then
      local m; for _, c in ipairs(src:GetChildren()) do if c.Name:match("^" .. ten .. "_%d+$") then m = c end end
      if m and not m:FindFirstChildOfClass("Humanoid") then for _, d in ipairs(m:GetDescendants()) do if d:IsA("Model") and d:FindFirstChildOfClass("Humanoid") then m = d; break end end end   -- gói nhiều rig (dan_01 = Civilians): lấy rig đầu
      if m then cl = m:Clone(); cl.Name = vai
        for _, d in ipairs(cl:GetDescendants()) do
          if d:IsA("Script") or d:IsA("LocalScript") then d:Destroy()
          elseif d:IsA("Humanoid") then d.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None; d.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff   -- không hiện nhãn tên/máu
          elseif d:IsA("BasePart") then d.Anchored = true; d.CanCollide = false; d.CanQuery = false; d.CanTouch = false; d:SetAttribute("T0", d.Transparency) end end
        cl.Parent = fold end
    end
    local hum = cl and cl:FindFirstChildWhichIsA("Humanoid", true); if hum then hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None; hum.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff end
    local torso = cl and cl:FindFirstChild("Torso", true)
    local tv = NV[vai .. "__" .. LIMB.Torso]
    if torso and tv then
      local Tr = torso.CFrame; local Nt = nodeRest(tv)
      local r = { m = cl, limbs = {}, extra = {}, byName = {} }
      for name, sub in pairs(LIMB) do local p = torso.Parent:FindFirstChild(name); local key = vai .. "__" .. sub; local v = NV[key]
        if p and v then local want = Nt * RPI * (attr("TuTheRig", false) and (Tr:Inverse() * p.CFrame) or R6STD[name])   -- nghỉ: khớp R6 chuẩn (rig mẫu có thể đang giơ tay chào…); TuTheRig = giữ tư thế mẫu
          local L = { p = p, key = key, id = idOf[key], D = nodeRest(v):Inverse() * want }
          table.insert(r.limbs, L); r.byName[name] = L end end
      for _, d in ipairs(cl:GetDescendants()) do if d:IsA("BasePart") and not LIMB[d.Name] or (d:IsA("BasePart") and d.Parent ~= torso.Parent) then
        if d.Name == "HumanoidRootPart" then d.Transparency = 1 else
          local best, bd = nil, 1e9
          for _, L in pairs(r.byName) do local dist = (L.p.Position - d.Position).Magnitude; if d:IsDescendantOf(L.p) then dist = -1 end; if dist < bd then best, bd = L, dist end end
          if best then table.insert(r.extra, { p = d, L = best, rel = best.p.CFrame:Inverse() * d.CFrame }) end end end end
      local hd = r.byName.Head; r.face = hd and hd.p:FindFirstChildOfClass("Decal"); r.face0 = r.face and r.face.Texture
      for i, pp in ipairs(MAN.parts) do if pp.k == "F" and pp.n:sub(1, #vai + 2) == vai .. "__" then r.faceId = i - 1 end end
      RB[vai] = r
    end
  end
end
-- đặt rig theo hàm khung bộ phận: frameOf(key) → CFrame node phim (đã cộng gốc) hoặc nil; trả true nếu hiện
function M.rbPose(r, frameOf, faceTex)
  local show = false
  for _, L in ipairs(r.limbs) do local N = frameOf(L.key); if N then L.p.CFrame = N * L.D; show = true end end
  for _, d in ipairs(r.m:GetDescendants()) do if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" then d.Transparency = show and (d:GetAttribute("T0") or 0) or 1 end end
  for _, e in ipairs(r.extra) do e.p.CFrame = e.L.p.CFrame * e.rel end
  if r.face then if faceTex and attr("MatPhim", true) then r.face.Texture = faceTex else r.face.Texture = r.face0 end; r.face.Transparency = show and 0 or 1 end
  return show
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
    local g = MESH[id]
    if g then   -- nhân vật gốc: nhóm MeshPart thay khối Part
      seen[id] = true
      local cf = ORIGIN * CFrame.new(r[2], r[3], r[4], r[5], r[6], r[7], r[8])
      local k = Vector3.new(r[9] / g.rest.X, r[10] / g.rest.Y, r[11] / g.rest.Z)
      for _, sb in ipairs(g.subs) do sb.p.Size = sb.size * axisK(sb.rot, k);   -- k theo trục node → trục mảnh
        sb.p.CFrame = cf * CFrame.new(sb.pos * k) * sb.rot; sb.p.Transparency = info.tr or 0 end
      if p then p.Transparency = 1; p.CastShadow = false end
    elseif p then
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
  for id, g in pairs(MESH) do if not seen[id] then for _, sb in ipairs(g.subs) do sb.p.Transparency = 1 end end end
  -- gấu: đặt nguyên khối theo mảnh thân; ẩn các khối Part của vai gấu
  for vai, b in pairs(BEAR) do
    local row; for _, r in ipairs(fr.parts) do if r[1] == b.id then row = r; break end end
    local show = row ~= nil
    for _, d in ipairs(b.m:GetDescendants()) do if d:IsA("BasePart") and d.Name ~= "RootPart" then d.LocalTransparencyModifier = show and 0 or 1; d.Transparency = show and 0 or 1 end end
    if row then M.setK(b, row[10] / b.body.s[2]); b.m:PivotTo(ORIGIN * CFrame.new(row[2], row[3], row[4], row[5], row[6], row[7], row[8]) * b.restInv * CFrame.Angles(0, math.pi, 0)) end
    for id, p in pairs(PARTS) do local nm = MAN.parts[id + 1].n; if nm:sub(1, #vai + 2) == vai .. "__" then p.Transparency = 1; local dc = p:FindFirstChild("Mat"); if dc then dc.Transparency = 1 end end end
  end
  -- nhân vật Roblox: lái rig theo node phim; ẩn khối Part + tấm mặt của vai đó
  if next(RB) then
    local rows = {}; for _, r in ipairs(fr.parts) do rows[r[1]] = r end
    for vai, rb in pairs(RB) do
      local face; local fr2 = rb.faceId and rows[rb.faceId]; if fr2 and fr2[12] and MAN.faces[tostring(fr2[12])] then face = "rbxassetid://" .. MAN.faces[tostring(fr2[12])] end
      local byKey = {}; for _, L in ipairs(rb.limbs) do byKey[L.key] = L.id end
      M.rbPose(rb, function(key) local r = byKey[key] and rows[byKey[key]]; return r and ORIGIN * CFrame.new(r[2], r[3], r[4], r[5], r[6], r[7], r[8]) end, face)
      for id, p in pairs(PARTS) do local nm = MAN.parts[id + 1].n; if nm:sub(1, #vai + 2) == vai .. "__" then p.Transparency = 1; seen[id] = nil; local dc = p:FindFirstChild("Mat"); if dc then dc.Transparency = 1 end end end
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
    for _, nm in ipairs(it.names) do local p = cfg.Manh:FindFirstChild(nm)
      local bv = nm:match("^(nv%d%d_%w+)__0_0_0_0$"); local bb = bv and BEAR[bv]
      local gp; for id, g in pairs(MESH) do if MAN.parts[id + 1].n == nm then gp = g end end
      local rl; for _, rb in pairs(RB) do for _, L in ipairs(rb.limbs) do if L.key == nm then rl = L end end end
      if rl and rl.p.Transparency < 1 then local c = rl.p.CFrame * rl.D:Inverse(); local v = inv * c.Position; parts[nm] = { v.X, v.Y, v.Z }
      elseif bb then local root = bb.m:GetPivot() * CFrame.Angles(0, -math.pi, 0); local c = root * bb.restInv:Inverse(); local v = inv * c.Position; parts[nm] = { v.X, v.Y, v.Z }
      elseif gp and gp.subs[1].p.Transparency < 1 then local sb = gp.subs[1]; local k = axisK(sb.rot, sb.p.Size / sb.size, true)
        local c = sb.p.CFrame * (CFrame.new(sb.pos * k) * sb.rot):Inverse(); local v = inv * c.Position; parts[nm] = { v.X, v.Y, v.Z }
      elseif p and p.Transparency < 1 then local v = inv * p.Position; parts[nm] = { v.X, v.Y, v.Z } end end
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
