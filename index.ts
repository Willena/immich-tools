import {Option, program} from "commander";
import {DedupAction, GroupAction, HashAction, MergeAlbumAction, MissingAction, StackerAction} from "./commands";
import {version} from './package.json'

program
    .name("immich-tools")
    .version(version)
    .description("List of tools to be used with immich");

program.command("hash")
    .description("Compute sha1 hashes from Google photo archives or file system")
    .addOption(new Option('-p, --progress', 'Add all assets to the specified album name').default(false))
    .addOption(new Option("-s, --save <savePath>", "Save hashes to a checkpoint file"))
    .argument('[paths...]', 'One or more paths needs to be analysed')
    .action(async (paths, options) => {
        await new HashAction(paths, options).run();
    })

program.command("dedup")
    .description("Find duplicate assets based on their thumbnails and perceptual hash / difference")
    .addOption(new Option("-t, --threshold", "Percentage (0-1) of similarities to be considered as duplicate").default(0.8))
    .addOption(new Option("--stacked", "Do not ignore stacked photos. (Stacked are usually same photos RAW+JPEG for example)").default(false))
    .action(async (options) => {
        await new DedupAction(options).run();
    })

program.command("missing")
    .description("Find not uploaded assets from hashes")
    .addOption(new Option('-p, --progress', 'Show progress while uploading').default(false))
    .addOption(new Option('-u, --upload', 'Upload missing items').default(false))
    .addOption(new Option('-l, --list', 'Display list of missing files').default(false))
    .arguments("<hashFile...>")
    .action(async (hashFile, options) => {
        await new MissingAction(hashFile, options).run()
    })

program.command("group")
    .description("Try to group assets into albums automatically based on date,location,album,...")
    .addOption(new Option("-a, --apply <checkpoint...>", "Apply saved checkpoint"))
    .addOption(new Option("-h, --hashfile <hashfile...>", "Use hash and original location"))
    .addOption(new Option("-s, --save <checkpoint>", "Save propositions to file for review before execution"))
    .addOption(new Option("-o, --orphans", "Find only orphan assets (not in any album)").default(false))
    .addOption(new Option('--home <latlong>', "Home geo-point"))
    .addOption(new Option('--min-distance <minDistance>', "Min physical distance to start new album (km)").default(1))
    .addOption(new Option("--min-assets <minAssets>", "Min assets in a group to create a new album").default(5))
    .addOption(new Option("--max-duration <maxDuration>", "Max duration (in second) between items to separate in other album").default(12 * 3600))
    .addOption(new Option('--album-name-format <format>', "Name format for album").default("${year}-${month}${days(endDate-startDate)==1?${startDate.day}:''} - ${name}"))
    .action(async (options) => {
        await new GroupAction(options).run()
    })


program.command("merge")
    .description("Merge albums into a single one")
    .addOption(new Option("--from <sourceAlbum...>", "Source albums name/ids to be merged"))
    .addOption(new Option("--to <destAlbum>", "Destination album name"))
    .addOption(new Option("--no-create", "Create album if messing"))
    .addOption(new Option("--delete", "Delete source album after assets are added to the destination"))
    .action(async (options) => {
        await new MergeAlbumAction(options).run()
    })

program.command("stack")
    .description("Tool that tries to match pictures that are stackable automatically")
    .addOption(new Option('-p, --progress', 'Add all assets to the specified album name').default(false))
    .action(async (options) => {
        await new StackerAction(options).run();
    })


program.parse(process.argv);