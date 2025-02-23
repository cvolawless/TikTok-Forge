import { spring } from "remotion";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
} from "remotion";
import { Subtitle } from "./HelloWorld/Subtitle";
import { Title } from "./HelloWorld/Title";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { Logo as EzedinLogo } from "../src/components/Logo";


export const myCompSchema = z.object({
  titleText: z.string(),
  titleColor: zColor(),
  logoColor1: zColor(),
  logoColor2: zColor(),
});

export const HelloWorld: React.FC<z.infer<typeof myCompSchema>> = ({
  titleText: propOne,
  titleColor: propTwo
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Animate from 0 to 1 after 25 frames
  const logoTranslationProgress = spring({
    frame: frame - 25,
    fps,
    config: {
      damping: 100,
    },
  });

  // Move the logo up by 150 pixels once the transition starts
  const logoTranslation = interpolate(
    logoTranslationProgress,
    [0, 1],
    [0, -150],
  );

  // Fade out the animation at the end
  const opacity = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames - 15],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const scale = spring({
    frame,
    fps
  });

  // A <AbsoluteFill> is just a absolutely positioned <div>!
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a192f" }}>
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill style={{ transform: `translateY(${logoTranslation}px)` }}>
          {/* <Logo logoColor1={logoColor1} logoColor2={logoColor2} /> */}
          <Sequence>
           <div 
           style={{
            transform: `scale(${scale})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
           }}>
             <EzedinLogo color="#64ffda" />
           </div>
          </Sequence>
        </AbsoluteFill>
        {/* Sequences can shift the time for its children! */}
        <Sequence from={35}>
          <Title titleText={propOne} titleColor={propTwo} />
        </Sequence>
        {/* The subtitle will only enter on the 75th frame. */}
        <Sequence from={75}>
          <Subtitle />
        </Sequence>
      </AbsoluteFill>
      <Audio src="https://freepd.com/music/Think About It.mp3" />
    </AbsoluteFill>
  );
};
