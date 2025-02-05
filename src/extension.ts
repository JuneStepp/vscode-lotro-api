import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ImageProvider, LotroImageHoverProvider } from './LotroImageHoverProvider';
import LuaColorShow from './LuaColorShow';

interface XMLSchemaAssocation {
	pattern: string,
	systemId: string
};

const schemas: XMLSchemaAssocation[] = [
	{ pattern: '**/*.plugin', systemId: 'lotroplugin.xsd' },
	{ pattern: '**/*.plugincompendium', systemId: 'plugincompendium.xsd' },
	{ pattern: '**/*.musiccompendium', systemId: 'musiccompendium.xsd' },
	{ pattern: '**/*.skincompendium', systemId: 'skincompendium.xsd' },
	{ pattern: '**/SkinDefinition.xml', systemId: 'lotro-skin.xsd' },
];

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log("activate lunarwtr.lotro-api", context.extension.id);

	const extensionPath = vscode.extensions.getExtension(context.extension.id)?.extensionPath;
	const config = vscode.workspace.getConfiguration("Lua");
	let globals: {[id: string] : string} | undefined = config.get("runtime.special");
	if (globals && !globals.import) {
		globals.import = 'require';
		config.update("runtime.special", globals);
	}
	config.update("runtime.version", "Lua 5.1");
	config.update("runtime.pathStrict", false);
	const searchPaths: string[] | undefined = config.get("runtime.path");
	if (searchPaths) {
		if (searchPaths.indexOf('?/__init__.lua') === -1) {
			searchPaths.push('?/__init__.lua');
		}
		config.update("runtime.path",searchPaths);
	}
	if (extensionPath) {
		// define plugin location
		config.update("runtime.plugin", path.join(extensionPath!, 'Lua', 'Plugin', 'plugin.lua'));
		// define API library location
		const library: string[] | undefined = config.get("workspace.library");
		if (library) {
			const filteredLib = library.filter(a => !/vscode-lotro-api/.test(a) && a.indexOf(context.extension.id) === -1);
			if (library.length > 0 && filteredLib.length !== library.length) {
				// early version settings were placed in global settings.. update them
				config.update("workspace.library", filteredLib, true);
			}
			filteredLib.push(path.join(extensionPath!, 'Lua', 'EmmyLua', 'Turbine'));
			config.update("workspace.library", filteredLib);
		}
		// define plugin association and schema locations
		const xmlConfig = vscode.workspace.getConfiguration("xml");
		let schemasAssoc: XMLSchemaAssocation[] | undefined = xmlConfig.get("fileAssociations");
		if (schemasAssoc) {
			schemasAssoc = schemas.map(s => ({ ...s, systemId: path.join(extensionPath!, 'xsds', s.systemId) }))
				.concat(schemasAssoc.filter(a => !/(\.((plugin|music|skin)compendium|plugin)|SkinDefinition\.xml)$/.test(a.pattern)));
			xmlConfig.update("fileAssociations", schemasAssoc);
		}
	}

	// Register our color provider for Turbine Colors
	let luaColorShowDisposable = vscode.languages.registerColorProvider(
		{ pattern: "**/*.lua" },
		new LuaColorShow()
	);
	context.subscriptions.push(luaColorShowDisposable);

	const imageProvider = new ImageProvider(vscode.workspace.workspaceFolders, path.join(os.tmpdir(), 'lotro-api'));
	const hoverProvider = new LotroImageHoverProvider(imageProvider);
	const hover = vscode.languages.registerHoverProvider(
		["lua", "xml"],
		hoverProvider
	);
	context.subscriptions.push(hover, imageProvider);

}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log("deactivate lunarwtr.lotro-api");
}
