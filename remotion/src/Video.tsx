// src/Video.tsx
import { Composition } from "remotion";
import { z } from "zod";
import VideoTemplate, { parseTimingString } from "./compositions/Template1";
import scenes from "./scenes.json";

// // Define Zod schema for props validation
// const TikTokVideoSchema = z
//   .object({
//     title: z.string(),
//     description: z.string().optional(),
//     backgroundImage: z.string().optional(),
//     audioSrc: z.string().optional(),
//     style: z.enum(["caption", "split", "fullscreen"]).optional(),
//     duration: z.number().optional(),
//   })
//   .passthrough(); // Allow additional properties


  const DynamicVideoSchema = z
    .object({
      scenes: z.array(
        z.object({})
      )
    })
    .passthrough(); // Allow additional properties

export const RemotionVideo: React.FC = () => {
  const totalDuration = scenes.scenes.reduce((acc, scene) => {
    const { end } = parseTimingString(scene.timing);
    return Math.max(acc, end);
  }, 0);
  return (
    <>
      <Composition<typeof DynamicVideoSchema, Record<string, unknown>>
        id="TikTokVideo"
        component={VideoTemplate}
        durationInFrames={totalDuration}
        fps={30}
        width={1080}
        height={1920}
        schema={DynamicVideoSchema}
        defaultProps={
          {
            scenes: scenes.scenes
          }
        }
      />
    </>
  );
};
