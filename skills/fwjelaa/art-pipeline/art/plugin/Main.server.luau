--!strict
-- Local Studio plugin (built with `rojo build art/plugin.project.json --plugin MHGArtUploader.rbxm`).
-- AssetService:CreateAssetAsync only works from locally loaded plugins, so the Studio MCP drives uploads through
-- the BindableFunction this plugin puts in ServerStorage (not archivable, never saved into the place).
local AssetService = game:GetService("AssetService")
local RunService = game:GetService("RunService")
local ServerStorage = game:GetService("ServerStorage")

-- Edit mode loads plugins only when Studio starts, but each Play session reloads them from disk, so the bridge also
-- runs in the Play server: rebuild the plugin, press Play, upload without restarting Studio.
if not (RunService:IsEdit() or (RunService:IsServer() and RunService:IsRunning())) then
	return
end

local meshes = script.Parent:WaitForChild("Meshes")

type MeshData = { v: string, n: string, t: string, f: string }

local function numbers(text: string): { number }
	local list = {}
	for _, token in string.split(text, ",") do
		table.insert(list, tonumber(token) :: number)
	end
	return list
end

local function build(data: MeshData): EditableMesh
	local mesh = AssetService:CreateEditableMesh()
	local positions, normals, uvs, faces = numbers(data.v), numbers(data.n), numbers(data.t), numbers(data.f)
	local vertexIds, normalIds, uvIds = {}, {}, {}
	for i = 1, #positions // 3 do
		local p, n = (i - 1) * 3, (i - 1) * 3
		vertexIds[i] = mesh:AddVertex(Vector3.new(positions[p + 1], positions[p + 2], positions[p + 3]))
		normalIds[i] = mesh:AddNormal(Vector3.new(normals[n + 1], normals[n + 2], normals[n + 3]))
		uvIds[i] = mesh:AddUV(Vector2.new(uvs[(i - 1) * 2 + 1], uvs[(i - 1) * 2 + 2]))
	end
	for i = 1, #faces // 3 do
		local a, b, c = faces[(i - 1) * 3 + 1] + 1, faces[(i - 1) * 3 + 2] + 1, faces[(i - 1) * 3 + 3] + 1
		local face = mesh:AddTriangle(vertexIds[a], vertexIds[b], vertexIds[c])
		mesh:SetFaceNormals(face, { normalIds[a], normalIds[b], normalIds[c] })
		mesh:SetFaceUVs(face, { uvIds[a], uvIds[b], uvIds[c] })
	end
	return mesh
end

local function upload(name: string): { [string]: any }
	local module = meshes:FindFirstChild(name)
	if not (module and module:IsA("ModuleScript")) then
		return { ok = false, error = `no mesh data named {name}` }
	end
	local mesh = build(require(module) :: any)
	local ok, result, idOrError = pcall(function()
		return AssetService:CreateAssetAsync(mesh, Enum.AssetType.Mesh, {
			Name = `MHG_{name}`,
			Description = "My Haunted Graveyard prop",
		})
	end)
	mesh:Destroy()
	if ok and result == Enum.CreateAssetResult.Success then
		return { ok = true, id = idOrError }
	end
	return { ok = false, error = if ok then `{result}: {idOrError}` else tostring(result) }
end

local old = ServerStorage:FindFirstChild("MHGArtUploader")
if old then
	old:Destroy()
end
local bridge = Instance.new("BindableFunction")
bridge.Name = "MHGArtUploader"
bridge.Archivable = false
bridge.OnInvoke = function(command: string, name: string?)
	if command == "list" then
		local names = {}
		for _, child in meshes:GetChildren() do
			table.insert(names, child.Name)
		end
		table.sort(names)
		return names
	elseif command == "upload" and name then
		return upload(name)
	end
	return { ok = false, error = `unknown command {command}` }
end
bridge.Parent = ServerStorage

plugin.Unloading:Connect(function()
	bridge:Destroy()
end)
