-- tools/roblox-kiem-nv.lua — kiểm bằng số sân duyệt nhân vật (sau tools/roblox-duyet-nv.lua): mỗi node nvNN_* so với nhan-vat.json
-- (tâm hộp trong khung node, cỡ, mặt hộp 6 mảnh đúng phía, độ méo Size/MeshSize). Trả tổng + tối đa 10 mảnh lệch nhất.
return function(URL, boQua)
  local H = game:GetService("HttpService")
  local NV = H:JSONDecode(H:GetAsync(URL .. "nhan-vat.json")); local META = H:JSONDecode(H:GetAsync(URL .. "duyet.json"))
  local AX = { Vector3.xAxis, -Vector3.xAxis, Vector3.yAxis, -Vector3.yAxis, Vector3.zAxis, -Vector3.zAxis }
  local T = { n = 0, dc = 0, ds = 0, meo = 1, flip = 0, thieu = 0 }; local rows = {}
  for i, m in ipairs(META) do if not (boQua and boQua[m.vai]) then
    local root = CFrame.new(Vector3.new(3000, 400, 3000) + Vector3.new((i - 1) * 60, 0, 0)); local mdl = workspace:FindFirstChild(m.vai); local seen = {}
    local lo, hi = 1e9, -1e9; for k2, v2 in pairs(NV) do if k2:sub(1, #m.vai + 2) == m.vai .. "__" and not v2.an then lo = math.min(lo, v2.t[2] - v2.s[2] / 2); hi = math.max(hi, v2.t[2] + v2.s[2] / 2) end end
    local sc = (m.vai:match("bap$") or m.vai:match("bear")) and hi > lo and m.H / (hi - lo) or 1   -- như roblox-duyet-nv.lua (gấu thu nhỏ ở gốc phim)
    if mdl then for _, nd in ipairs(mdl:GetDescendants()) do local key = nd:IsA("Model") and nd.Name:match("^(.+)_Node$"); local v = key and NV[key]
      if v then seen[key] = true; T.n += 1; local parts, list = {}, {}
        for _, q in ipairs(nd:GetChildren()) do if q:IsA("MeshPart") then parts[tonumber(q.Name:sub(#key + 1)) or 1] = q; table.insert(list, q)
          local r = q.Size / q.MeshSize / sc; T.meo = math.max(T.meo, math.max(r.X, r.Y, r.Z) / math.min(r.X, r.Y, r.Z)) end end
        local q4 = v.q; local tgt = root * CFrame.new(v.t[1] * sc, v.t[2] * sc, v.t[3] * sc) * CFrame.new(0, 0, 0, q4[1], q4[2], q4[3], q4[4])
        local mn, mx = Vector3.new(1e9, 1e9, 1e9), Vector3.new(-1e9, -1e9, -1e9)
        for _, q in ipairs(list) do local h = q.Size / 2 for k = 0, 7 do local c = tgt:PointToObjectSpace(q.CFrame * Vector3.new((k % 2 == 0) and -h.X or h.X, (k % 4 < 2) and -h.Y or h.Y, (k < 4) and -h.Z or h.Z)); mn = mn:Min(c); mx = mx:Max(c) end end
        -- hướng: khung MeshPart·Rπ·Q phải trùng khung node phim (góc, rad); cỡ: hộp lưới trong khung node (MeshSize xoay ngược Q) so cỡ phim
        local Q = CFrame.new(0, 0, 0, q4[1], q4[2], q4[3], q4[4]); local ang = 0
        for _, q in ipairs(list) do local _, a = (tgt.Rotation:Inverse() * q.CFrame.Rotation * CFrame.Angles(0, math.pi, 0) * Q):ToAxisAngle(); ang = math.max(ang, math.abs(a)) end
        T.ang = math.max(T.ang or 0, ang)
        local dc = 0   -- gốc node suy từ từng MeshPart: N = vị trí mảnh − R_mảnh·Rπ·c (c = pc của primitive)
        for _, q in ipairs(list) do local c = v.pc and v.pc[tonumber(q.Name:sub(#key + 1)) or 1]
          if c then local N = q.Position - (q.CFrame.Rotation * CFrame.Angles(0, math.pi, 0)) * (Vector3.new(c[1], c[2], c[3]) * sc); dc = math.max(dc, (N - tgt.Position).Magnitude) else dc = math.max(dc, ((mn + mx) / 2).Magnitude) end end
        local ds = 0
        if #list == 1 then local r = list[1].Size / list[1].MeshSize / sc; ds = math.abs(r.X - 1) + math.abs(r.Y - 1) + math.abs(r.Z - 1) end
        T.dc = math.max(T.dc, dc); T.ds = math.max(T.ds, ds)
        if #list == 6 then for k = 1, 6 do if parts[k] and tgt:PointToObjectSpace(parts[k].Position):Dot(AX[k]) <= 0 then T.flip += 1 end end end
        if dc > 0.01 or ds > 0.01 or ang > 0.01 then table.insert(rows, { e = math.max(dc, ds, ang), s = string.format("%s tâm %.3f cỡ %.3f góc %.3f", key, dc, ds, ang) }) end
      end end end
    for k in pairs(NV) do if k:sub(1, #m.vai + 2) == m.vai .. "__" and not seen[k] then T.thieu += 1; table.insert(rows, { e = 99, s = "THIẾU " .. k }) end end
  end end
  table.sort(rows, function(a, b) return a.e > b.e end)
  local out = { string.format("node %d thiếu %d | tâm max %.4f | cỡ(tỉ lệ−1) max %.4f | góc max %.4f rad | méo max %.4f | mặt hộp lật %d | mảnh vượt 0,01: %d", T.n, T.thieu, T.dc, T.ds, T.ang or 0, T.meo, T.flip, #rows) }
  for i = 1, math.min(10, #rows) do table.insert(out, rows[i].s) end
  return table.concat(out, "\n")
end
