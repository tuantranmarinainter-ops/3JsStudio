-- tools/roblox-duyet-nv.lua — dựng SÂN DUYỆT nhân vật trong Studio (Edit): mọi vai nvNN_* (MeshPart nhập từ .glb) đặt tư thế nghỉ theo nhan-vat.json,
-- 3 gấu kẻ cắp = bản nhân bản workspace.PhimEp6B.Gau.*; tấm mặt Decal theo duyet.json. Trả hàm chup(i, goc) đặt camera như ảnh phim (fov 30, cùng khoảng cách).
return function(URL)
  local H = game:GetService("HttpService")
  local NV = H:JSONDecode(H:GetAsync(URL .. "nhan-vat.json"))
  local META = H:JSONDecode(H:GetAsync(URL .. "duyet.json"))
  local FACES = H:JSONDecode(H:GetAsync(URL .. "mat.json"))
  local P = require(game.ReplicatedStorage.PhimEp6B.PhatPhim)
  local BASE = Vector3.new(3000, 400, 3000)
  local san = workspace:FindFirstChild("SanDuyet") or Instance.new("Folder"); san.Name = "SanDuyet"; san:ClearAllChildren(); san.Parent = workspace
  local function blk(sz, cf, col) local p = Instance.new("Part"); p.Anchored = true; p.Size = sz; p.CFrame = cf; p.Color = col; p.Material = Enum.Material.SmoothPlastic; p.Parent = san; return p end
  local GAU = { nv01_bap = true, nv14_bearR = true, nv15_bearY = true }
  local roots = {}
  for i, m in ipairs(META) do
    local root = CFrame.new(BASE + Vector3.new((i - 1) * 60, 0, 0)); roots[i] = root
    blk(Vector3.new(50, 1, 50), root * CFrame.new(0, -0.5, 0), Color3.fromHex("#cfd3d8"))      -- sàn
    blk(Vector3.new(50, 40, 1), root * CFrame.new(0, 15, -20), Color3.fromHex("#cfd3d8"))      -- phông
    blk(Vector3.new(1, 40, 50), root * CFrame.new(-20, 15, 0), Color3.fromHex("#cfd3d8"))       -- vách trái (góc 3/4 nhìn chéo thấy mép phông)
    if GAU[m.vai] then
      local g = workspace.PhimEp6B.Gau:FindFirstChild(m.vai)
      if g then for _, d in ipairs(g:GetDescendants()) do if d:IsA("BasePart") and d.Name ~= "RootPart" then d.Transparency = 0; d.LocalTransparencyModifier = 0 end end; local s0 = g:GetAttribute("S0") or g:GetScale(); local cao = g:GetAttribute("Cao") or m.H; g:ScaleTo(s0 * m.H / cao); g:PivotTo(root * CFrame.Angles(0, math.pi, 0)) end
    else
      local mdl = workspace:FindFirstChild(m.vai)
      if mdl then for _, nd in ipairs(mdl:GetDescendants()) do
        local key = nd:IsA("Model") and nd.Name:match("^(.+)_Node$"); local v = key and NV[key]
        if v then local parts = {}; for _, q in ipairs(nd:GetChildren()) do if q:IsA("MeshPart") then table.insert(parts, q) end end
          if #parts > 0 then
            -- khung node như bộ phát (bù phép xoay của 3D Importer theo từng node, trả cỡ không méo); co giãn ĐỀU về cỡ phim
            local F, sz = P.nodeFrame(parts, Vector3.new(v.s[1], v.s[2], v.s[3]), v.q); local kk = 1   -- nodeFrame đã trả cỡ = MeshSize (tỉ lệ 1 như phim)
            local q4 = v.q; local tgt = root * CFrame.new(v.t[1], v.t[2], v.t[3]) * CFrame.new(0, 0, 0, q4[1], q4[2], q4[3], q4[4])
            for _, q in ipairs(parts) do local off = P.subOff(v, q, key); if off then q.Size = q.MeshSize else off = F:Inverse() * q.CFrame; q.Size = q.Size / kk end; q.CFrame = tgt * CFrame.new(off.Position / kk) * off.Rotation; q.Transparency = v.an and 1 or 0; q.Anchored = true end   -- v.an: phim ẩn mảnh này lúc nghỉ
          end end end end
      if m.face and m.face.id and FACES[tostring(m.face.id)] then
        local f = m.face; local p = blk(Vector3.new(f.s[1], f.s[2], f.s[3] + 0.02),   -- dày bằng hộp mặt phim: mặt Back (+Z) nằm đúng mặt trước đầu
           root * CFrame.new(f.p[1], f.p[2], f.p[3]) * CFrame.new(0, 0, 0, f.q[1], f.q[2], f.q[3], f.q[4]), Color3.new(1, 1, 1))
        p.Transparency = 1; p.CanCollide = false; local d = Instance.new("Decal"); d.Face = Enum.NormalId.Back; d.Texture = "rbxassetid://" .. FACES[tostring(f.id)]; d.Parent = p
      end
    end
  end
  return function(i, goc)
    local m = META[i]; local a = goc == "34" and math.pi / 4 or 0; local root = roots[i]
    game:GetService("Selection"):Set({}); local cam = workspace.CurrentCamera; cam.CameraType = Enum.CameraType.Scriptable; cam.FieldOfView = 30
    local pos = root * Vector3.new(math.sin(a) * m.D, m.cy, math.cos(a) * m.D)
    cam.CFrame = CFrame.lookAt(pos, root * Vector3.new(0, m.cy, 0))
    return #META
  end
end
