import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const exportSlidesToPPT = async (
  slideIds: string[],
  filename: string,
  onProgress?: (current: number, total: number) => void
) => {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";

  for (let i = 0; i < slideIds.length; i++) {
    const element = document.getElementById(slideIds[i]);
    if (!element) {
      console.warn(`Slide element ${slideIds[i]} not found`);
      continue;
    }

    if (onProgress) onProgress(i + 1, slideIds.length);

    try {
      // Give the slide a moment to render its contents/animations
      await wait(800);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#070708", // Match slide background
        removeContainer: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const slide = pptx.addSlide();
      slide.background = { color: "070708" };

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
