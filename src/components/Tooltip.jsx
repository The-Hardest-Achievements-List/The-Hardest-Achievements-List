import React, { useState } from "react";
import "./tooltip.css";

export default function Tooltip({
  children,
  text,
  className = "",
  position = "top",
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={`tooltip-container ${className} tooltip-${position}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {text && (
        <span
          className={`tooltip-box${visible ? " is-visible" : ""}`}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}
