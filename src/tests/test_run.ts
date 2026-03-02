import { downloadVideo } from "../downloader/videos";
downloadVideo("105208", "video_159015").then(() => console.log("Done")).catch(console.error);
