async function capture() {
    try {
        // Used for resizing the image
        const imgpath = "../output/screenshot.png";
        await screenshot({ filename: imgpath, format: "png" });
    } catch (err) {
        console.error("[!] Error : " + err);
    }
}