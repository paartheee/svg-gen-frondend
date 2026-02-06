import { jsPDF } from "jspdf";

export const downloadSVG = (svgString, filename = "image.svg") => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadImage = (svgString, filename, format = "png") => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            // Use standard dimensions or SVG dimensions
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext("2d");

            // Fill background for JPG (transparent by default for PNG)
            if (format === 'jpeg' || format === 'jpg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            const imgData = canvas.toDataURL(`image/${format}`, 1.0);
            const link = document.createElement("a");
            link.href = imgData;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            resolve();
        };

        img.onerror = reject;
        img.src = url;
    });
};

export const downloadPDF = (svgString, filename = "image.pdf") => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext("2d");
            // PDF white background usually preferred
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const imgData = canvas.toDataURL("image/png");

            // A4 size standard or match image? matching image 512px might be small on A4.
            // Let's make a PDF that matches the image dimensions (points).
            // 512px at 72dpi is 7.1 inches.
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: [512, 512]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 512, 512);
            pdf.save(filename);

            URL.revokeObjectURL(url);
            resolve();
        };
        img.onerror = reject;
        img.src = url;
    });
};
