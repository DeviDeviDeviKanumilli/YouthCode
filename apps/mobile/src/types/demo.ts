export type DemoObservedOutputs = {
  possible_species: string | null;
  confidence_label: string | null;
  signal_label: string | null;
  verification_status: string;
  sampling_label: string | null;
  final_signal_priority: string | null;
  sampling_gap_value: string | null;
  map_layers: string[];
  corridor_type: string | null;
};

export type DemoScenario = {
  id: string;
  title: string;
  persona: string;
  script_steps: string[];
  seeded_observation_id: string;
  map_query: {
    bbox?: string;
  };
  expected_outputs: Record<string, string | boolean>;
  observed_outputs: DemoObservedOutputs;
  assertions: Record<string, boolean>;
  deterministic: boolean;
};

export type DemoScenarioList = {
  scenarios: DemoScenario[];
};
