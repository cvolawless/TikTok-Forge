import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT_FAMILY } from "./constants";

const subtitle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: 40,
  textAlign: "center",
  position: "absolute",
  bottom: 700,
  width: "100%",
  color: "#ccd6f6"
};

const codeStyle: React.CSSProperties = {
  color: "#64ffda",
};

export const Subtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  return (
    <div style={{ ...subtitle, opacity }}>
      A place where you become a{" "} <span style={codeStyle}>TRUE</span> developer
    </div>
  );
};
