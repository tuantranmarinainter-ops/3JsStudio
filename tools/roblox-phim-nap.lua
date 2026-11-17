-- tools/roblox-phim-nap.lua — nạp dữ liệu phim (node tools/roblox-phim.mjs xuat) + bộ phát vào place, chạy trong Studio (chế độ Edit):
--   loadstring(HttpService:GetAsync(URL .. "nap.lua"))()(URL)
-- Ghi: ReplicatedStorage.PhimEp6B/{phim, sNNN (ModuleScript dữ liệu), PhatPhim (bộ phát)}, StarterPlayerScripts.PhimEp6B_Chay (LocalScript gọi run()).
return function(URL)
  local H = game:GetService("HttpService"); local RS = game:GetService("ReplicatedStorage")
  local F = RS:FindFirstChild("PhimEp6B") or Instance.new("Folder"); F.Name = "PhimEp6B"; F.Parent = RS
  -- luôn tạo ModuleScript MỚI (require lưu đệm theo instance: sửa Source của module cũ vẫn trả dữ liệu cũ)
  local function mod(name, src) local o = F:FindFirstChild(name); if o then o:Destroy() end; local m = Instance.new("ModuleScript"); m.Name = name; m.Source = src; m.Parent = F; return m end
  -- Source tối đa 200 000 ký tự → chia chuỗi JSON thành nhiều ModuleScript: <tên>, <tên>_2, <tên>_3… (PhatPhim ghép lại)
  local function data(name, str)
    local i, k = 1, 1
    while i <= #str do mod(k == 1 and name or (name .. "_" .. k), "return [==[" .. string.sub(str, i, i + 189999) .. "]==]"); i += 190000; k += 1 end
    local x = F:FindFirstChild(name .. "_" .. k); while x do x:Destroy(); k += 1; x = F:FindFirstChild(name .. "_" .. k) end
  end
  local man = H:GetAsync(URL .. "phim.json")
  data("phim", man)
  local okNV, nv = pcall(function() return H:GetAsync(URL .. "nhan-vat.json") end)   -- cỡ/tư thế nghỉ từng node .glb nhân vật (tools/roblox-nhan-vat-node.mjs)
  if okNV then data("nhanvat", nv) end
  local n = 0
  for _, s in ipairs(H:JSONDecode(man).shots) do data(s.id, H:GetAsync(URL .. s.id .. ".json")); n += 1; task.wait() end
  mod("PhatPhim", H:GetAsync(URL .. "phat.lua"))
  local sps = game:GetService("StarterPlayer"):WaitForChild("StarterPlayerScripts")
  local ls = sps:FindFirstChild("PhimEp6B_Chay") or Instance.new("LocalScript"); ls.Name = "PhimEp6B_Chay"
  ls.Source = [[-- phát phim ep6B (phòng Gà) khi bấm Play. Công tắc: thuộc tính của workspace.PhimEp6B (docs/handoff/roblox-phim-ep6b.md)
local pl = game:GetService("Players").LocalPlayer
local function catNhanVat(ch) local hrp = ch:WaitForChild("HumanoidRootPart", 5); if hrp then hrp.Anchored = true; ch:PivotTo(CFrame.new(0, 300, 0)) end end
if pl.Character then catNhanVat(pl.Character) end; pl.CharacterAdded:Connect(catNhanVat)
require(game:GetService("ReplicatedStorage"):WaitForChild("PhimEp6B"):WaitForChild("PhatPhim")).run()
]]
  ls.Parent = sps
  return "đã nạp " .. n .. " shot + PhatPhim + LocalScript"
end
