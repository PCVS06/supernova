import {createContext} from "react";
import type {MathematicalConstant} from "@/components/brand/constant-identity";

/** A conversation owns its reveal history so virtual rows cannot replay it. */
export const MathResponseContext = createContext<{constant: MathematicalConstant; revealedTurns: Set<string>} | null>(null);
