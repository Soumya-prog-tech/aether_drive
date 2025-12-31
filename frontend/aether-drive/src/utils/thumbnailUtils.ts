export interface ThumbnailData {
    type: "image" | "icon";
    mime: string;
    data: string; // Base64
}

export const generateThumbnail = (file: File): Promise<ThumbnailData | null> => {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            resolve(null);
            return;
        }

        const MAX_SIZE = 64;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;

        if (file.type.startsWith("image/")) {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale to fit within MAX_SIZE x MAX_SIZE
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                // Center image
                const x = (MAX_SIZE - width) / 2;
                const y = (MAX_SIZE - height) / 2;

                // Clear background (transparent)
                ctx.clearRect(0, 0, MAX_SIZE, MAX_SIZE);
                ctx.drawImage(img, x, y, width, height);

                URL.revokeObjectURL(img.src);
                resolve({
                    type: "image",
                    mime: "image/png",
                    data: canvas.toDataURL("image/png")
                });
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                resolve(null);
            };
            img.src = URL.createObjectURL(file);
        } else {
            // Generate Generic Icon
            // Background color based on type
            let color = "#64748b"; // slate-500 (default)
            if (file.type === "application/pdf") color = "#ef4444"; // red-500
            else if (file.type.startsWith("video/")) color = "#a855f7"; // purple-500
            else if (file.type.startsWith("audio/")) color = "#ec4899"; // pink-500
            else if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) color = "#3b82f6"; // blue-500
            else if (file.name.endsWith(".zip") || file.name.endsWith(".rar")) color = "#eab308"; // yellow-500
            else if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) color = "#22c55e"; // green-500

            // Draw rounded rect (simulated by filling rect for now, CSS handles border radius)
            // Actually, let's just fill the square, the UI will round it.
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE);

            // Draw Extension Text
            const ext = file.name.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE";
            ctx.fillStyle = "white";
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(ext, MAX_SIZE / 2, MAX_SIZE / 2);

            resolve({
                type: "icon",
                mime: "image/png",
                data: canvas.toDataURL("image/png")
            });
        }
    });
};
