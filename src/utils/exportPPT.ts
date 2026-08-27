import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";

export const exportSlidesToPPT = async (
  slideIds: string[],
  filename: string,
  onProgress?: (current: number, total: number) => void
) => {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";

  for (let i = 0; i < slideIds.length; i++) {
    const element = document.getElementById(slideIds[i]);
    if (!element) continue;

    if (onProgress) onProgress(i + 1, slideIds.length);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#000000",
      });

      const imgData = canvas.toDataURL("image/png");
      const slide = pptx.addSlide();
      slide.addImage({
        data: imgData,
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
      });
    } catch (err) {
      console.error(`Error capturing slide ${i}:`, err);
    }
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
};
