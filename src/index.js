import getPathForFile from "./app.js"
import { QBittorrent } from '@ctrl/qbittorrent';
import cp  from  "child_process";
import fs from 'fs';
import { ArgumentParser } from 'argparse';
import path from 'path';


process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));

  });

  
let info = fs.readFileSync('./package.json');



function loadArguments()
{
    const parser = new ArgumentParser({
        description: 'Automatically organize downloading folders for qbittorrent and kodi'
    });
    
    let version = info.version;
    parser.add_argument('file', { help: 'Torrent file' });
    parser.add_argument('-v', '--version', { action: 'version', version });
    parser.add_argument('-d', '--dev', { action: "store_true", help: 'need to be used during development' });
    /*parser.add_argument('-s', '--server', { help: 'qbittorrent webui url' });
    parser.add_argument('-u', '--user', { help: 'qbittorrent webui username' });
    parser.add_argument('-p', '--pass', { help: 'qbittorrent webui password' });
    parser.add_argument('-mr', '--moviesroot', { help: 'movies folder root' });
    parser.add_argument('-tvr', '--tvshowsroot', { help: 'tv shows folder root' });*/
    
    
    return parser.parse_args();
}

function loadSettings(isDev)
{
    let settings = {};
    try 
    {
        settings = JSON.parse(fs.readFileSync((isDev ? process.cwd() : path.dirname(process.execPath)) + '/settings.json'));
        return settings;
    }
    catch
    {
        console.log("Missing settings.json file.");
        process.exit(1);
    }
}

async function start()
{
    let params = loadArguments();
    let settings= loadSettings(params.dev);
    let args = {...settings, ...params};
    
    console.log(params.file);
    let content = await getPathForFile(args.file.replaceAll("\\", "/").split("/").pop(), args.moviesroot, args.tvshowsroot);
    console.log(content);
    
    const client = new QBittorrent({
        baseUrl: args.server,
        username: args.user,
        password: args.pass,
      });
      
    try {
    
        await client.addTorrent(fs.readFileSync(args.file), {
            firstLastPiecePrio: "true",
            sequentialDownload: content.path.includes("/Season ") ? "true" : "false",
            rename: `${content.title}${content.year ? ` (${content.year})` : ""}${content.season ? ` S${content.season}` : ""}${content.episode ? ` E${content.episode}` : ""}`, 
            savepath: content.path,
            root_folder: "false",
            ratioLimit: 1,
            seedingTimeLimit: 4320
        })
    }
    catch (e)
    {
        console.error("Failed to add the torrent (probably already added)");
    }

    var out = fs.openSync('./out.log', 'a');
    var err = fs.openSync('./out.log', 'a');
    
    cp.spawn(args.launch, {  detached: true,
        stdio: [ 'ignore', out, err ]})
    
} 

start();
