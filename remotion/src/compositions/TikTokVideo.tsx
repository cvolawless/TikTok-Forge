// src/compositions/TikTokVideo.tsx
import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
  spring,
  useCurrentFrame,
  interpolate,
} from "remotion";

// Define our internal props interface
interface TikTokVideoBaseProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  audioSrc?: string;
  style?: "caption" | "split" | "fullscreen";
  duration?: number;
}

// The component accepts any props but we'll validate internally
export const TikTokVideo = (props: Record<string, unknown>) => {
  // Type cast and validate props
  const {
    title,
    description,
    backgroundImage = "/api/placeholder/1080/1920",
    style = "caption",
    duration = 300,
  } = props as TikTokVideoBaseProps;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timing
  const titleStart = 0;
  const descriptionStart = 30;

  // Calculate spring animations
  const titleAnimation = spring({
    frame: frame - titleStart,
    fps,
    config: { damping: 12 },
  });

  const descriptionAnimation = spring({
    frame: frame - descriptionStart,
    fps,
    config: { damping: 12 },
  });

  // Text fade animation
  const textOpacity = interpolate(
    frame,
    [duration - 30, duration - 15],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Background Image/Video */}
      <AbsoluteFill>
        <img
          src={backgroundImage}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          alt="background"
        />
        {/* Overlay for better text readability */}
        <AbsoluteFill
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          }}
        />
      </AbsoluteFill>

      {/* Content Layout */}
      {style === "caption" && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: "40px",
            gap: "20px",
          }}
        >
          <Sequence from={titleStart}>
            <div
              style={{
                transform: `translateY(${(1 - titleAnimation) * 100}px)`,
                opacity: Math.min(titleAnimation, textOpacity),
                fontSize: "64px",
                fontWeight: "bold",
                color: "white",
                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
              }}
            >
              {title}
            </div>
          </Sequence>

          {description && (
            <Sequence from={descriptionStart}>
              <div
                style={{
                  transform: `translateY(${(1 - descriptionAnimation) * 100}px)`,
                  opacity: Math.min(descriptionAnimation, textOpacity),
                  fontSize: "32px",
                  color: "white",
                  textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                  marginBottom: "60px",
                }}
              >
                {description}
              </div>
            </Sequence>
          )}
        </AbsoluteFill>
      )}

      {style === "split" && (
        <AbsoluteFill
          style={{
            flexDirection: "row",
          }}
        >
          {/* Left side - Image */}
          <div style={{ flex: 1 }}>
            <img
              src={backgroundImage}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              alt="split view"
            />
          </div>

          {/* Right side - Text */}
          <div
            style={{
              flex: 1,
              padding: "40px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Sequence from={titleStart}>
              <div
                style={{
                  transform: `translateX(${(1 - titleAnimation) * 100}px)`,
                  opacity: Math.min(titleAnimation, textOpacity),
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "20px",
                }}
              >
                {title}
              </div>
            </Sequence>

            {description && (
              <Sequence from={descriptionStart}>
                <div
                  style={{
                    transform: `translateX(${(1 - descriptionAnimation) * 100}px)`,
                    opacity: Math.min(descriptionAnimation, textOpacity),
                    fontSize: "24px",
                    color: "white",
                  }}
                >
                  {description}
                </div>
              </Sequence>
            )}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
