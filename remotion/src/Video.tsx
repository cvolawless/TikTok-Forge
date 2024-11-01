// src/Video.tsx
import { Composition } from "remotion";
import { z } from "zod";
import { TikTokVideo } from "./compositions/TikTokVideo";

// Define Zod schema for props validation
const TikTokVideoSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    backgroundImage: z.string().optional(),
    audioSrc: z.string().optional(),
    style: z.enum(["caption", "split", "fullscreen"]).optional(),
    duration: z.number().optional(),
  })
  .passthrough(); // Allow additional properties

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition<typeof TikTokVideoSchema, Record<string, unknown>>
        id="TikTokVideo"
        component={TikTokVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={TikTokVideoSchema}
        defaultProps={{
          title: "Sample Title",
          description: "This is a sample description for the video",
          style: "caption",
          backgroundImage: "/api/placeholder/1080/1920",
          duration: 300,
        }}
      />
    </>
  );
};
