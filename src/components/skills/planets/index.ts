import type { ComponentType } from "react";
import type { PlanetBodyProps } from "./shared";
import ConsumerBehaviourPlanet from "./ConsumerBehaviourPlanet";
import CreativeStrategyPlanet from "./CreativeStrategyPlanet";
import MarketResearchPlanet from "./MarketResearchPlanet";
import ProductMarketingPlanet from "./ProductMarketingPlanet";
import BrandIdentityPlanet from "./BrandIdentityPlanet";
import ConsumerInsightsPlanet from "./ConsumerInsightsPlanet";
import CommunicationPlanet from "./CommunicationPlanet";
import BusinessDevelopmentPlanet from "./BusinessDevelopmentPlanet";

/** Skill id → its planet body. Each skill reads by look, not by text. */
export const PLANET_BODIES: Record<string, ComponentType<PlanetBodyProps>> = {
  "consumer-behaviour": ConsumerBehaviourPlanet,
  "creative-strategy": CreativeStrategyPlanet,
  "market-research": MarketResearchPlanet,
  "product-marketing": ProductMarketingPlanet,
  "brand-identity": BrandIdentityPlanet,
  "consumer-insights": ConsumerInsightsPlanet,
  communication: CommunicationPlanet,
  "business-development": BusinessDevelopmentPlanet,
};

export { PLANET_LAYOUT, OUTER_ORBIT } from "./layout";
export type { PlanetLayout } from "./layout";
