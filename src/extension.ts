import { ExtensionContext, commands, workspace, window } from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";
//import * as explain from "./explain";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

const outputChannel = window.createOutputChannel("Dhall LSP");

export async function activate(context: ExtensionContext) {
  console.log('..Extension "vscode-dhall-lsp-server" is now active..');

  const config = workspace.getConfiguration("vscode-dhall-lsp-server");

  const userDefinedExecutablePath = config.executable;

  let executablePath =
    userDefinedExecutablePath === ""
      ? "dhall-lsp-server"
      : userDefinedExecutablePath;

  try {
    await promisify(execFile)(executablePath, ["version"], {
      timeout: 10000,
      windowsHide: true,
    });
  } catch (e) {
    window.showErrorMessage(
      `Failed to execute 'dhall-lsp-server': ${(e as Error).message}` +
        "You might need to install [Dhall LSP server](https://github.com/PanAeon/dhall-lsp-server).\n" +
        "Also you might want to set an absolute path to the `dhall-lsp-server` executable " +
        "in the plugin settings."
    );
    return;
  }

  // TODO: properly parse extra arguments!! UNIT TEST !!
  const logFile: string = config.logFile;

  const logFileOpt: string[] =
    logFile.trim() === "" ? [] : ["--log=" + logFile];

  // let serverCommand = '~/.local/bin/dhall-lsp-server'; // context.asAbsolutePath(path.parse());
  // let serverCommand = context.asAbsolutePath(path.join('/home/vitalii/.local/bin/dhall-lsp-server'));

  let runArgs: string[] = [...logFileOpt];
  let debugArgs: string[] = [...logFileOpt];

  let serverOptions: ServerOptions = {
    run: {
      command: executablePath,
      transport: TransportKind.stdio,
      args: runArgs,
    },
    debug: {
      command: executablePath,
      transport: TransportKind.stdio,
      args: debugArgs,
    },
  };

  let clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "dhall" }],
    //synchronize: {
    //  configurationSection: "vscode-dhall-lsp-server",
    //  // Notify the server about file changes to '.clientrc files contained in the workspace
    //  fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    //},
    initializationOptions: {
      "vscode-dhall-lsp-server": workspace.getConfiguration(
        "vscode-dhall-lsp-server"
      ),
    },
    outputChannel: outputChannel,
  };

  client = new LanguageClient(
    "vscode-dhall-lsp-server",
    "VSCode Dhall Language Server",
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand("dhall.lint", (editor, edit) => {
      const cmd = {
        command: "dhall.server.lint",
        arguments: [editor.document.uri.toString()],
      };
      client.sendRequest("workspace/executeCommand", cmd);
    })
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand("dhall.annotateLet", (editor, edit) => {
      const cmd = {
        command: "dhall.server.annotateLet",
        arguments: [
          {
            position: editor.selection.active,
            textDocument: { uri: editor.document.uri.toString() },
          },
        ],
      };
      client.sendRequest("workspace/executeCommand", cmd);
    })
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand("dhall.freezeImport", (editor, edit) => {
      const cmd = {
        command: "dhall.server.freezeImport",
        arguments: [
          {
            position: editor.selection.active,
            textDocument: { uri: editor.document.uri.toString() },
          },
        ],
      };
      client.sendRequest("workspace/executeCommand", cmd);
    })
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand(
      "dhall.freezeAllImports",
      (editor, edit) => {
        const cmd = {
          command: "dhall.server.freezeAllImports",
          arguments: [editor.document.uri.toString()],
        };
        client.sendRequest("workspace/executeCommand", cmd);
      }
    )
  );

  // enable "dhall-explain" URIs
  /*
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      "dhall-explain",
      new explain.ExplainProvider()
    )
  );
	*/

  context.subscriptions.push(client.start());
  outputChannel.appendLine("Dhall LSP Server started");
}

export function deactivate() {
  return client?.stop();
}
