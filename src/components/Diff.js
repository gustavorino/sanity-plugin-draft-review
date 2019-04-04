import React from "react";
import * as jsdiff from "diff";

export default function Diff({ inputA, inputB }) {
  const diff = jsdiff.diffJson(inputA, inputB);
  const result = diff.map((part, index) => {
    if (!part.added && !part.removed) {
      return null;
    }
    const spanStyle = {
      backgroundColor: part.added
        ? "lightgreen"
        : part.removed
        ? "salmon"
        : "lightgrey"
    };

    return (
      <span key={index} style={spanStyle}>
        {part.value}
      </span>
    );
  });
  return <pre>{result}</pre>;
}
