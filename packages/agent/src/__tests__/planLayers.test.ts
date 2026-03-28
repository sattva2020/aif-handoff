import { describe, it, expect } from "vitest";
import { computePendingPlanLayers, computePlanLayers, formatLayerSummary } from "../planLayers.js";

describe("plan layer parsing", () => {
  it("computes parallel layer for dependency fan-out", () => {
    const plan = `
### Phase 1: Setup
- [ ] **Task 1: Scaffold package**

### Phase 2: Build
- [ ] **Task 2: Build component** (depends on 1)
- [ ] **Task 3: Add styles** (depends on 1)

### Phase 3: Verify
- [ ] **Task 4: Verify** (depends on 2, 3)
`;
    const { layers } = computePlanLayers(plan);
    expect(layers).toEqual([[1], [2, 3], [4]]);
  });

  it("uses implicit phase dependencies when depends-on is omitted", () => {
    const plan = `
### Phase 1
- [ ] **Task 1: one**
- [ ] **Task 2: two**

### Phase 2
- [ ] **Task 3: three**
`;
    const { layers } = computePlanLayers(plan);
    expect(layers).toEqual([[1, 2], [3]]);
  });

  it("does not parse non-checkbox heading-style tasks", () => {
    const plan = `
### Task 1: Init
**Depends on:** nothing

### Task 2: UI
**Depends on:** Task 1

### Task 3: CSS
**Depends on:** Task 1
`;
    const { layers } = computePlanLayers(plan);
    expect(layers).toEqual([]);
  });

  it("formats summary for prompt injection", () => {
    const text = formatLayerSummary([[1], [2, 3], [4]]);
    expect(text).toContain("Layer 2 (parallel): tasks 2, 3");
  });

  it("does not parse numbered checklist tasks without `Task` keyword", () => {
    const plan = `
## Fix Steps
1. [ ] Remove footer html
2. [x] Remove footer css
3. [ ] Remove footer js (depends on 1)
`;
    const { layers } = computePendingPlanLayers(plan);
    expect(layers).toEqual([]);
  });

  it("does not parse numbered plain steps", () => {
    const plan = `
## Steps
1. Create endpoint
2) Add tests
3. Verify integration
`;
    const { layers } = computePendingPlanLayers(plan);
    expect(layers).toEqual([]);
  });

  it("parses checkbox Task rows with heading prefix", () => {
    const plan = `
### Phase 1
#### - [x] Task 1: Done base setup
#### - [ ] Task 2: Add feature (depends on 1)
`;
    const { layers } = computePendingPlanLayers(plan);
    expect(layers).toEqual([[2]]);
  });

  it("treats [~] Task as in-progress (pending)", () => {
    const plan = `
### Phase 1
- [x] Task 1: Base setup
- [~] Task 2: Coordinator is working now (depends on 1)
`;
    const { layers } = computePendingPlanLayers(plan);
    expect(layers).toEqual([[2]]);
  });
});
