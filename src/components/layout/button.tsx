import { useWallet } from "@solana/wallet-adapter-react"; // Import the useWallet hook from Solana wallet adapter
import classNames from "classnames"; // Import the classNames utility for conditionally applying class names
import React, { ReactNode } from "react"; // Import React and ReactNode for typing

// Define the possible states for the Button component
export type ButtonState = "initial" | "loading" | "success" | "error";

// Define the props for the Button component
type Props = {
  state: ButtonState; // The current state of the button
  onClick: () => void; // The function to call when the button is clicked
  children: ReactNode; // The content to display inside the button
  className?: string; // Optional additional class name(s) for the button
};

// Button component definition
export function Button({ state, onClick, children, className = "" }: Props) {
  const { publicKey } = useWallet(); // Get the public key from the wallet using the useWallet hook

  if (!publicKey) {
    return null; // If there is no public key, render nothing
  }

  // Generate the class names for the button based on its state and additional className
  const buttonClasses = classNames("btn", className, {
    "btn-loading": state === "loading",
    "btn-success": state === "success",
    "btn-error": state === "error",
  });

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={state === "loading"} 
    >
      {state === "loading" ? "Loading..." : children} 
    </button>
  );
}
