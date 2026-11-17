-- tools/roblox-boi-canh.lua: dựng một bối cảnh từ <ENV>.json (node tools/roblox-boi-canh.mjs xuat …) thành Part + model trong workspace.<FOLDER or "BoiCanh">.<ENV>. Studio nạp qua: node tools/roblox-boi-canh.mjs phuc-vu
return function(ENV, ORIGIN, URL, FOLDER)
local H = game:GetService("HttpService")
local d = H:JSONDecode(H:GetAsync(URL .. ENV .. ".json"))
-- loại vân của phim (userData.matKind) → vật liệu sẵn có của Roblox. Mỗi part ghi thuộc tính Van (loại) + VatLieuVan (tên vật liệu);
-- tắt vân: đặt Material = SmoothPlastic cho part có VatLieuVan; bật lại: Enum.Material[part:GetAttribute('VatLieuVan')] (docs/roblox.md mục 8).
local MAT = { wood = Enum.Material.WoodPlanks, woodpaint = Enum.Material.Wood, plaster = Enum.Material.Plaster, fabric = Enum.Material.Fabric,
  knit = Enum.Material.Fabric, fur = Enum.Material.Fabric, chrome = Enum.Material.Metal, enamel = Enum.Material.SmoothPlastic, tile = Enum.Material.CeramicTiles,
  paper = Enum.Material.SmoothPlastic, metalpaint = Enum.Material.Metal, iron = Enum.Material.Metal, concrete = Enum.Material.Concrete, brick = Enum.Material.Brick,
  asphalt = Enum.Material.Asphalt, grass = Enum.Material.Grass, grassground = Enum.Material.Grass, foliage = Enum.Material.LeafyGrass, soil = Enum.Material.Ground,
  shingle = Enum.Material.RoofShingles, roof = Enum.Material.ClayRoofTiles, stone = Enum.Material.Slate, metal = Enum.Material.Metal, glass = Enum.Material.Glass,
  rubber = Enum.Material.Rubber, cardboard = Enum.Material.Cardboard, matte = Enum.Material.Plastic, roadpaint = Enum.Material.SmoothPlastic }
-- part không khai loại vân: đoán theo tên
local TEN = { {'brick', 'brick'}, {'gach', 'brick'}, {'roof', 'roof'}, {'mai_', 'roof'}, {'ngoi', 'roof'}, {'shingle', 'shingle'}, {'wood', 'wood'}, {'_go', 'wood'},
  {'concrete', 'concrete'}, {'vha_he', 'concrete'}, {'thung', 'cardboard'}, {'sidewalk', 'concrete'}, {'curb', 'concrete'}, {'via_he', 'concrete'}, {'road', 'asphalt'}, {'duong', 'asphalt'},
  {'grass', 'grass'}, {'_co_', 'grass'}, {'tuong', 'plaster'}, {'wall', 'plaster'}, {'steel', 'metal'}, {'iron', 'iron'}, {'metal', 'metal'}, {'fence', 'metalpaint'} }
local function kindOf(p) if p.kind and MAT[p.kind] then return p.kind end
  local n = string.lower(p.n or '') for _, t in ipairs(TEN) do if n:find(t[1], 1, true) then return t[2] end end return nil end
local root = workspace:FindFirstChild((FOLDER or "BoiCanh")) or Instance.new("Folder", workspace); root.Name = (FOLDER or "BoiCanh")
local old = root:FindFirstChild(ENV); if old then old:Destroy() end
local F = Instance.new("Folder"); F.Name = ENV
local base = CFrame.new(ORIGIN)
local function cfOf(p) return base * CFrame.new(p.p[1], p.p[2], p.p[3], p.q[1], p.q[2], p.q[3], p.q[4]) end
local function style(part, p)
  local hex = (p.map and p.avg and (p.c == nil or p.c == "#ffffff")) and p.avg or p.c
  if p.map and p.avg and p.c and p.c ~= "#ffffff" then local a, b = Color3.fromHex(p.c), Color3.fromHex(p.avg); part.Color = Color3.new(a.R * b.R, a.G * b.G, a.B * b.B)
  else part.Color = hex and Color3.fromHex(hex) or Color3.fromRGB(200, 200, 200) end
  part.Anchored = true; part.TopSurface = Enum.SurfaceType.Smooth; part.BottomSurface = Enum.SurfaceType.Smooth
  local kd = kindOf(p); part.Material = (kd and MAT[kd]) or Enum.Material.SmoothPlastic
  if kd then part:SetAttribute("Van", kd); part:SetAttribute("VatLieuVan", part.Material.Name) end
  if p.kind == "chrome" then part.Reflectance = 0.3 end
  if p.op and p.op < 1 then part.Transparency = 1 - p.op; if p.op < 0.5 then part.Material = Enum.Material.Glass end end
  local ln = string.lower(p.n or "")
  if p.em and (ln:find("bulb") or ln:find("bong") or ln:find("den") or ln:find("lamp") or ln:find("sang") or ln:find("neon") or ln:find("glow") or ln:find("light") or ln:find("tube")) and not ln:find("post") and not ln:find("pole") then part.Material = Enum.Material.Neon end
  if p.map then part:SetAttribute("CoAnh", true) end
end
local function mk(name, size, cf, p, shape)
  local part = Instance.new("Part"); part.Name = name
  if shape then part.Shape = shape end
  part.Size = Vector3.new(math.max(size.X, 0.02), math.max(size.Y, 0.02), math.max(size.Z, 0.02)); part.CFrame = cf
  style(part, p); part.Parent = F; return part
end
local skip, nPart, anh, GAU = {}, 0, {}, {}
local function wedgeTri(name, a, b, c, p, T)
  local ab, ac, bc = b - a, c - a, c - b
  local abd, acd, bcd = ab:Dot(ab), ac:Dot(ac), bc:Dot(bc)
  if abd > acd and abd > bcd then c, a = a, c elseif acd > bcd and acd > abd then a, b = b, a end
  ab, ac, bc = b - a, c - a, c - b
  local right = ac:Cross(ab).Unit; local up = bc:Cross(right).Unit; local back = bc.Unit
  local height = math.abs(ab:Dot(up))
  local function w(size, cf) local q = Instance.new('WedgePart'); q.Name = name; q.Size = Vector3.new(T or 0.05, math.max(height, 0.02), math.max(size, 0.02)); q.CFrame = cf; style(q, p); q.Parent = F end
  w(math.abs(ab:Dot(back)), CFrame.fromMatrix((a + b) / 2, right, up, back))
  w(math.abs(ac:Dot(back)), CFrame.fromMatrix((a + c) / 2, -right, up, -back))
end

local function rect(pts) local a, b, c, e = 1e9, -1e9, 1e9, -1e9 for _, v in ipairs(pts) do a = math.min(a, v[1]); b = math.max(b, v[1]); c = math.min(c, v[2]); e = math.max(e, v[2]) end return {a, b, c, e} end
local function wallFromShape(p, sh, T)
  local xs, ys = {}, {}
  local function add(t, v) for _, x in ipairs(t) do if math.abs(x - v) < 1e-3 then return end end table.insert(t, v) end
  local O = rect(sh.o); local HO = {} for _, h in ipairs(sh.h) do table.insert(HO, rect(h)) end
  for _, r in ipairs({O, unpack(HO)}) do add(xs, r[1]); add(xs, r[2]); add(ys, r[3]); add(ys, r[4]) end
  table.sort(xs); table.sort(ys)
  local sx, sy = p.s[1], p.s[2]
  for j = 1, #ys - 1 do
    local run = nil
    local function flush(x1) if run then local w, hh = (x1 - run) * sx, (ys[j+1] - ys[j]) * sy
      mk(p.n, Vector3.new(w, hh, T), cfOf(p) * CFrame.new((run + x1) / 2 * sx, (ys[j] + ys[j+1]) / 2 * sy, -T / 2), p); nPart += 1; run = nil end end
    for i = 1, #xs - 1 do
      local mx, my = (xs[i] + xs[i+1]) / 2, (ys[j] + ys[j+1]) / 2
      local inside = mx > O[1] and mx < O[2] and my > O[3] and my < O[4]
      for _, r in ipairs(HO) do if mx > r[1] and mx < r[2] and my > r[3] and my < r[4] then inside = false end end
      if inside then run = run or xs[i] else flush(xs[i]) end
    end
    flush(xs[#xs])
  end
end
local function isRect(sh) if #sh.o > 6 then return false end for _, h in ipairs(sh.h) do if #h > 6 then return false end end return true end
for i, p in ipairs(d.prim) do
  local s = p.s; local pa = p.pa
  if p.n:find("vet_sang") or p.n:find("bong_do") then table.insert(skip, p.n .. " (vệt sáng/bóng)")
  elseif p.boxes then
    for bi, q in ipairs(p.boxes) do
      local pp = { n = p.n, c = q[11] or p.c, kind = p.kind, op = p.op, em = p.em }
      if p.n:find('kinh_sang') or p.n:find('_den') or p.n:find('bong') then pp.em = pp.c end
      if p.n:find('kinh_toi') then pp.op = 0.6 end
      mk(p.n, Vector3.new(q[8], q[9], q[10]), base * CFrame.new(q[1], q[2], q[3], q[4], q[5], q[6], q[7]), pp); nPart += 1
      if bi % 200 == 0 then task.wait() end
    end
    for _, q in ipairs(p.tris or {}) do
      wedgeTri(p.n, ORIGIN + Vector3.new(q[1], q[2], q[3]), ORIGIN + Vector3.new(q[4], q[5], q[6]), ORIGIN + Vector3.new(q[7], q[8], q[9]), { n = p.n, c = q[10] or p.c, kind = p.kind }); nPart += 2
    end
  elseif p.n:find('^bear_plush') and p.bb then table.insert(GAU, p)
  elseif p.t == "BoxGeometry" then mk(p.n, Vector3.new(pa.width * s[1], pa.height * s[2], pa.depth * s[3]), cfOf(p), p); nPart += 1
  elseif p.t == "PlaneGeometry" then mk(p.n, Vector3.new(pa.width * s[1], pa.height * s[2], 0.05), cfOf(p), p); nPart += 1; if p.map then table.insert(anh, p.n) end
  elseif p.t == "CylinderGeometry" then local r = math.max(pa.radiusTop, pa.radiusBottom)
    mk(p.n, Vector3.new(pa.height * s[2], 2 * r * s[1], 2 * r * s[3]), cfOf(p) * CFrame.Angles(0, 0, math.pi / 2), p, Enum.PartType.Cylinder); nPart += 1
  elseif p.t == "SphereGeometry" then local r = pa.radius * math.max(s[1], s[2], s[3])
    mk(p.n, Vector3.new(2 * r, 2 * r, 2 * r), cfOf(p), p, Enum.PartType.Ball); nPart += 1
  elseif (p.t == "ShapeGeometry" or p.t == "ExtrudeGeometry") and p.sh and isRect(p.sh[1]) and (#p.sh[1].h > 0 or p.n:find("tuong") or p.n:find("wall")) then
    for _, sh in ipairs(p.sh) do wallFromShape(p, sh, (p.pa and p.pa.depth) or 0.3) end
  elseif p.sh and p.sh[1] and #p.sh[1].h == 0 and (#p.sh[1].o == 3 or (#p.sh[1].o == 4 and p.sh[1].o[1][1] == p.sh[1].o[4][1] and p.sh[1].o[1][2] == p.sh[1].o[4][2])) then
    local o, s, T = p.sh[1].o, p.s, (p.pa and p.pa.depth) or 0.05
    local cf = cfOf(p)
    local function P(v) return cf:PointToWorldSpace(Vector3.new(v[1] * s[1], v[2] * s[2], (p.pa and p.pa.depth or 0) * s[3] / 2)) end
    wedgeTri(p.n, P(o[1]), P(o[2]), P(o[3]), p, T * s[3]); nPart += 2
  elseif p.t == "TubeGeometry" then table.insert(skip, p.n .. " (dây/ống)")
  elseif p.bb then local b = p.bb
    local size = Vector3.new((b[4] - b[1]) * s[1], (b[5] - b[2]) * s[2], math.max((b[6] - b[3]) * s[3], 0.05))
    mk(p.n, size, cfOf(p) * CFrame.new((b[1] + b[4]) / 2 * s[1], (b[2] + b[5]) / 2 * s[2], (b[3] + b[6]) / 2 * s[3]), p); nPart += 1
    table.insert(skip, p.n .. " (" .. p.t .. " → khối xấp xỉ)")
  else table.insert(skip, p.n .. " (" .. p.t .. ")") end
  if i % 60 == 0 then task.wait() end
end
local SRC = workspace:FindFirstChild("Tap3_NhomA")
local function aabb(m) local mn, mx = Vector3.one * 1e9, -Vector3.one * 1e9
  for _, q in ipairs(m:GetDescendants()) do if q:IsA("BasePart") then local h = q.Size / 2
    for a = -1, 1, 2 do for b = -1, 1, 2 do for c = -1, 1, 2 do local w = q.CFrame:PointToWorldSpace(Vector3.new(h.X * a, h.Y * b, h.Z * c)); mn = mn:Min(w); mx = mx:Max(w) end end end end end
  return mn, mx end
local CACHE = {}
local function findSrc(short) if CACHE[short] ~= nil then return CACHE[short] end
  local r = false for _, x in ipairs(SRC:GetDescendants()) do if x:IsA("Model") and (x.Name == short or x.Name:sub(1, #short + 1) == short .. "_") then r = x break end end
  CACHE[short] = r; return r end
local nG, miss, lech = 0, {}, 0
for i, gl in ipairs(d.glb) do
  local short = gl.id:match("/(.+)$") or gl.id
  local src = findSrc(short)
  if not src then miss[gl.id] = (miss[gl.id] or 0) + 1 else
    local m = src:Clone(); m.Name = short; m.Parent = F
    m:PivotTo(CFrame.new(m:GetPivot().Position))
    local mn, mx = aabb(m); local k = gl.bboxLocal[2] * gl.s[2] / math.max(mx.Y - mn.Y, 1e-3); m:ScaleTo(m:GetScale() * k)
    local q = gl.q; m:PivotTo(CFrame.new(m:GetPivot().Position) * CFrame.new(0, 0, 0, q[1], q[2], q[3], q[4]))
    mn, mx = aabb(m); local want = ORIGIN + Vector3.new(gl.center[1], gl.center[2], gl.center[3])
    m:PivotTo(m:GetPivot() + (want - (mn + mx) / 2)); nG += 1
    mn, mx = aabb(m); if (((mn + mx) / 2) - want).Magnitude > 0.1 then lech += 1 end
  end
  if i % 10 == 0 then task.wait() end
end
local gauSrc = SRC and SRC:FindFirstChild('NhomB') and SRC.NhomB:FindFirstChild('bear')
for _, p in ipairs(GAU) do
  if gauSrc then local b, s = p.bb, p.s
    local m = gauSrc:Clone(); m.Name = p.n; m.Parent = F
    m:PivotTo(CFrame.new(m:GetPivot().Position)); local mn, mx = aabb(m)
    m:ScaleTo(m:GetScale() * ((b[5] - b[2]) * s[2]) / math.max(mx.Y - mn.Y, 1e-3))
    local cf = cfOf(p) * CFrame.new((b[1] + b[4]) / 2 * s[1], (b[2] + b[5]) / 2 * s[2], (b[3] + b[6]) / 2 * s[3])
    m:PivotTo(CFrame.new(m:GetPivot().Position) * cf.Rotation); mn, mx = aabb(m); m:PivotTo(m:GetPivot() + (cf.Position - (mn + mx) / 2)); nG += 1
  else table.insert(skip, p.n .. ' (thiếu NhomB.bear)') end
end
F.Parent = root
local ms = {} for k, v in pairs(miss) do table.insert(ms, k .. " x" .. v) end
local sk = {} for _, v in ipairs(skip) do sk[v] = (sk[v] or 0) + 1 end
local sks = {} for k, v in pairs(sk) do table.insert(sks, k .. (v > 1 and (" x" .. v) or "")) end
return string.format("%s: Part %d | GLB %d/%d (lệch tâm >0,1: %d) | thiếu GLB: %s\nẢnh → màu TB: %d mặt\nBỏ/xấp xỉ: %s", ENV, nPart, nG, #d.glb, lech, table.concat(ms, ", "), #anh, table.concat(sks, "; "))
end
