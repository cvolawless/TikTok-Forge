import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  Img,
  Series,
  Audio,
} from "remotion";
import { CodeBlock } from "../components/code-block";

type VisualElementType = "code" | "logo" | "image";
type OverlayType = "text" | "logo";

interface VisualElement {
  type: VisualElementType;
  language?: string;
  animation?: "typing";
  highlight_lines?: number[];
  content: string;
  position?: { x: "left" | "right"; y: "top" | "middle" | "bottom" };
  size?: "small" | "medium" | "large";
  name?: string;
  prompt?: string;
  image_url?: string;
  overlays?: Overlay[];
}

interface Overlay {
  name: string;
  position: { x: "left" | "right"; y: "top" | "middle" | "bottom" };
  size: "small" | "medium" | "large";
  type: OverlayType;
  content: string;
  style: {
    position: { x: "left" | "right"; y: "top" | "middle" | "bottom" };
    font_size: "large" | "medium" | "small";
    emphasis: "bold" | "normal";
    name?: string;
  };
}

interface Scene {
  timing: string;
  script: string;
  script_audio?: string;
  visual_elements?: VisualElement[];
}

export const parseTimingString = (
  timing: string,
): { start: number; end: number } => {
  const [start, end] = timing.split("-").map(Number);
  return { start: start * 30, end: end * 30 }; // Assuming 30fps
};

const SceneTransition = ({
  children,
  timing,
}: {
  children: React.ReactNode;
  timing: string;
}): JSX.Element => {
  const frame = useCurrentFrame();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { start: _, end } = parseTimingString(timing);
  const duration = end;

  const opacity = interpolate(
    frame,
    [0, 15, duration - 15, duration],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <div style={{ opacity }} className="w-full h-full">
      {children}
    </div>
  );
};

const Logo = ({
  name,
  position,
  size,
}: {
  name: string;
  position: { x: "left" | "right"; y: "top" | "middle" | "bottom" };
  size: "small" | "medium" | "large";
}): JSX.Element => {
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32",
  };

  const positionClasses = {
    "left-top": "left-4 top-4",
    "left-middle": "left-4 top-1/2 -translate-y-1/2",
    "left-bottom": "left-4 bottom-4",
    "right-top": "right-4 top-4",
    "right-middle": "right-4 top-1/2 -translate-y-1/2",
    "right-bottom": "right-4 bottom-4",
  };

  // const positionKey: keyof typeof positionClasses = `${position.x}-${position.y}`;

  return (
    <div
      className={`absolute right-top ${sizeClasses[size]}`}
    >
      <Img
        src={`https://abrudz.github.io/logos/${name}.svg`}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

const TextOverlay = ({
  content,
  style,
}: {
  content: string;
  style: {
    position: { x: "left" | "right"; y: "top" | "middle" | "bottom" };
    font_size: "large" | "medium" | "small";
    emphasis: "bold" | "normal";
  };
}): JSX.Element => {
  const frame = useCurrentFrame();
  const fps = 30; // Assuming 30fps, adjust if necessary
  const scale = spring({ frame, fps, from: 0.8, to: 1, durationInFrames: 30 });

  const getFontSize = (size: "large" | "medium" | "small") => {
    switch (size) {
      case "large":
        return "text-4xl";
      case "medium":
        return "text-2xl";
      case "small":
        return "text-lg";
      default:
        return "text-2xl";
    }
  };

  return (
    <div
      className={`absolute ${style.position.x}-4 ${style.position.y}-4 
        ${getFontSize(style.font_size)} 
        ${style.emphasis === "bold" ? "font-bold" : "font-normal"}`}
      style={{ transform: `scale(${scale})` }}
    >
      {content}
    </div>
  );
};

const getMinioUrl = (path: string): string => {
  if (!path) return "";
  return `http://localhost:9000/assets/${path}`;
};

const AnimatedImage = ({ src, prompt }: { src: string; prompt?: string }) => {
  const frame = useCurrentFrame();
  const fps = 30; // Assuming 30fps, adjust if necessary

  const scale = spring({
    fps,
    frame,
    from: 0.8,
    to: 1,
    durationInFrames: 30,
  });

  const opacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 30,
  });

  return (
    <div className="w-full max-w-2xl mx-auto my-4">
      <div
        className="bg-slate-800 rounded-lg overflow-hidden"
        style={{
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {/* Image container with 16:9 aspect ratio */}
        <div className="relative w-full pb-[56.25%]">
          <Img
            src={src}
            alt={prompt || "Scene illustration"}
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
        {prompt && (
          <div className="p-4 border-t border-slate-700">
            <p className="text-gray-300 italic text-sm">{prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SceneComponent = ({ scene }: { scene: Scene }): JSX.Element => {
  const audioUrl = scene.script_audio ? getMinioUrl(scene.script_audio) : null;

  return (
    <SceneTransition timing={scene.timing}>
      {audioUrl && <Audio src={audioUrl} volume={1} startFrom={0} />}
      <div className="w-full h-full bg-slate-900 text-white p-8 flex flex-col justify-center">
        {/* Rest of your scene rendering code */}
        <div className="mb-8">
          <p className="text-3xl">{scene.script}</p>
        </div>

        {/* Visual elements */}
        <div className="relative">
          {scene.visual_elements?.map((element, index) => {
            switch (element.type) {
              case "code":
                return (
                  <div key={index} className="w-full pl-2 pr-2 mx-auto">
                    <CodeBlock
                      language={element.language}
                      isAnimated={element.animation === "typing"}
                      highlightLines={element.highlight_lines}
                    >
                      {element.content}
                    </CodeBlock>
                  </div>
                );

              case "logo":
                return (
                  <Logo
                    key={index}
                    name={element.name ?? "defaultName"}
                    position={element.position ?? { x: "left", y: "top" }}
                    size={element.size ?? "medium"}
                  />
                );

              case "image":
                return element.image_url ? (
                  <AnimatedImage
                    key={index}
                    src={getMinioUrl(element.image_url)}
                    prompt={element.prompt}
                  />
                ) : (
                  <div key={index} className="w-full max-w-2xl mx-auto my-4">
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <p className="text-gray-300 italic">{element.prompt}</p>
                    </div>
                  </div>
                );

              default:
                return null;
            }
          })}

          {/* Overlays */}
          {scene.visual_elements?.map((element) =>
            element.overlays?.map((overlay, index) => {
              switch (overlay.type) {
                case "text":
                  return (
                    <TextOverlay
                      key={`text-${index}`}
                      content={overlay.content}
                      style={overlay.style}
                    />
                  );
                case "logo":
                  return (
                    <Logo
                      key={`logo-${index}`}
                      name={overlay.name}
                      position={overlay.position}
                      size={overlay.size}
                    />
                  );
                default:
                  return null;
              }
            }),
          )}
        </div>
      </div>
    </SceneTransition>
  );
};

const VideoTemplate = (props: Record<string, unknown>): JSX.Element => {
  const { scenes } = props as unknown as { scenes: Scene[] };
  // Calculate total duration for debugging
  const sequenceData = scenes.map((scene) => {
    const { start, end } = parseTimingString(scene.timing);
    return {
      scene,
      from: start,
      duration: end - start,
    };
  });

  return (
    <AbsoluteFill className="bg-slate-900">
      <Series>
        {sequenceData.map(({ scene, duration }, index) => (
          <Series.Sequence
            key={index}
            durationInFrames={duration}
            name={`Scene ${index + 1} (${scene.timing})`}
          >
            <div className="absolute inset-0">
              <SceneComponent scene={scene} />
            </div>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

export default VideoTemplate;
