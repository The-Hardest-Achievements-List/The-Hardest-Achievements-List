import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  hasProjectedShift,
  PROJECTION_TOOLTIP,
} from "../utils/estimateRank";
import "./Tooltip.css";

export function ProjectedRankTooltipContent({ entry }) {
  if (!hasProjectedShift(entry)) {
    return <span>{PROJECTION_TOOLTIP}</span>;
  }

  const delta = entry.projectedRank - entry.listRank;
  const shift = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div className="proj-tooltip">
      <div className="proj-tooltip__ranks">
        <span className="proj-tooltip__from">#{entry.listRank}</span>
        <span className="proj-tooltip__arrow" aria-hidden="true">
          →
        </span>
        <span className="proj-tooltip__to">#{entry.projectedRank}</span>
        <span className="proj-tooltip__shift">{shift}</span>
      </div>
      <p className="proj-tooltip__note">{PROJECTION_TOOLTIP}</p>
    </div>
  );
}

const VIEWPORT_PAD = 12;

function clampTooltipPosition(triggerRect, tooltipRect) {
  const centerX = triggerRect.left + triggerRect.width / 2;
  const halfW = tooltipRect.width / 2;
  const minCenter = VIEWPORT_PAD + halfW;
  const maxCenter = window.innerWidth - VIEWPORT_PAD - halfW;
  const left = Math.max(minCenter, Math.min(maxCenter, centerX));

  const gap = 8;
  const spaceAbove = triggerRect.top - VIEWPORT_PAD;
  const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_PAD;
  const placeBelow =
    spaceAbove < tooltipRect.height + gap && spaceBelow > spaceAbove;

  if (placeBelow) {
    return {
      left,
      top: triggerRect.bottom + gap,
      transform: "translate(-50%, 0)",
      position: "bottom",
    };
  }

  return {
    left,
    top: triggerRect.top - gap,
    transform: "translate(-50%, -100%)",
    position: "top",
  };
}

export default function Tooltip({
  children,
  text,
  content,
  className = "",
  position = "top",
}) {
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipContent = content ?? text;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    setPlacement(clampTooltipPosition(triggerRect, tooltipRect));
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, tooltipContent, updatePosition]);

  useEffect(() => {
    if (!visible) return undefined;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible, updatePosition]);

  const handleEnter = () => {
    setVisible(true);
  };

  const handleLeave = () => {
    setVisible(false);
    setPlacement(null);
  };

  const tooltipStyle = placement
    ? {
        top: placement.top,
        left: placement.left,
        transform: placement.transform,
        visibility: "visible",
      }
    : {
        top: -9999,
        left: -9999,
        visibility: "hidden",
      };

  return (
    <>
      <span
        ref={triggerRef}
        className={`tooltip-container ${className} tooltip-${position}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        {children}
      </span>
      {tooltipContent &&
        visible &&
        createPortal(
          <span
            ref={tooltipRef}
            className={`tooltip-box tooltip-box--portal tooltip-${placement?.position ?? position} is-visible`}
            style={tooltipStyle}
            role="tooltip"
          >
            {tooltipContent}
          </span>,
          document.body,
        )}
    </>
  );
}
