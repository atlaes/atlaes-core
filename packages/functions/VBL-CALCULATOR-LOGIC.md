# VBL Refund Calculator — How It Works

## Overview

The calculator determines **eligibility** and **estimated refund amount** for VBL (Versorgungsanstalt des Bundes und der Länder) pension contribution refunds. It supports three categories of claimants and produces two separate refund amounts.

---

## Two Refund Types Calculated

| Type | Description | Rate |
|------|-------------|------|
| **DRV** (Deutsche Rentenversicherung) | State pension refund | **9.3%** of capped gross salary per month |
| **VBLklassik** | Supplementary pension refund | **1.81%** of capped gross salary per month |

For Stage/Orchestra (VddB/VddKO), the rate is **4.5%** instead.

**VAT: 0%** — no VAT is applied to supplementary refunds.

---

## Three Calculation Methods

The system automatically picks the right method based on employment end date and employment type.

### 1. Pre-2018 (employment ended before 1 Jan 2018)

**Eligibility rules — ALL must be met:**

1. User has **left the public sector** (employment end date is in the past)
2. Employment was in **West Germany**
3. Total contribution period is **less than 60 months** (< 5 years)
4. Only **VBLklassik** contributions (no VBLextra)
5. User is **younger than 69** years old
6. Contributions have **not been moved** to another supplementary insurance

**Refund (legacy/fallback):** `months × €50` per month flat rate
**Refund (period-based):** Uses actual salary × rates × months (see Period-Based Calculation below)

---

### 2. Post-2018 (employment ended on/after 1 Jan 2018)

**Eligibility rules — ALL must be met:**

1. Same as pre-2018 rules 1, 2, 4, 5, 6
2. **Consecutive** contribution period is **less than 36 months** (< 3 years)
3. **Total** contribution period is **less than 60 months** (< 5 years)

This is stricter than pre-2018: the post-2018 rules add a consecutive months check on top of the total months check.

---

### 3. Stage/Orchestra (VddB/VddKO)

**Triggered when:** employment type contains "stage", "orchestra", "bühne", "performing arts", or pension provider is VddB/VddKO.

**Eligibility rules:**

1. Minimum **12 months** contributed
2. Maximum **36 months** for employments ending after 2003 (unlimited if pre-2003)
3. Must meet **one** of these employment-end conditions:
   - 24 months have passed since employment ended
   - User has occupational disability
   - Mandatory insurance is no longer required
   - User is too old to complete 36 months before retirement age (default 67)

---

## Period-Based Calculation (the accurate method)

When the user provides job details with salary and dates, the system calculates refunds per-year using official contribution caps.

### Yearly Salary Caps

| Year | West Cap (€/month) | East Cap (€/month) |
|------|-------------------:|-------------------:|
| 2018 | 6,500 | 5,800 |
| 2019 | 6,700 | 6,150 |
| 2020 | 6,900 | 6,450 |
| 2021 | 7,100 | 6,700 |
| 2022 | 7,050 | 6,750 |
| 2023 | 7,300 | 7,100 |
| 2024 | 7,550 | 7,450 |
| 2025 | 8,050 | — (unified) |

### How It Works

1. Each job period is split at year boundaries (e.g., a job from Sep 2019 to Mar 2021 → 3 segments)
2. For each segment: `min(gross salary, cap for that year) × rate × number of months`
3. DRV and VBLklassik are calculated separately and then summed

### Worked Example

Someone earning **€7,000/month** in **West Germany** in **2020**:

- Capped salary = min(€7,000, €6,900) = **€6,900**
- DRV contribution per month = €6,900 × 9.3% = **€641.70**
- VBLklassik contribution per month = €6,900 × 1.81% = **€124.89**
- Total refund per month = **€766.59**

### East Germany Restriction

East Germany periods are **not refundable** for supplementary pensions. The system checks that all periods are in West Germany states.

**West Germany states:** Baden-Württemberg, Bavaria, Berlin (West), Bremen, Hamburg, Hesse, Lower Saxony, North Rhine-Westphalia, Rheinland-Palatinate, Saarland, Schleswig-Holstein

**East Germany states:** Berlin (East), Brandenburg, Mecklenburg-Western Pomerania, Saxony, Saxony-Anhalt, Thuringia

---

## Simplified Calculator (Frontend Multi-Step Flow)

The frontend collects minimal info from users and the system derives everything automatically.

### What the User Provides (per job)

- Employment type (Public Sector, Stage/Performing Arts, etc.)
- Start and end dates
- Average monthly gross salary (as a range, e.g. "5,000 - 6,000")
- German federal state
- Supplementary pension provider(s)

### What the System Derives Automatically

| Derived Field | How |
|--------------|-----|
| West/East Germany | From the state name |
| Total months contributed | From date ranges |
| Consecutive months | By checking gaps between jobs (allows 1-month gap) |
| Has left public sector | If last job end date is in the past |
| Is Stage/Orchestra | From employment type keywords or pension provider |
| Has VBLextra | From pension provider list |

### Salary Range Parsing

- `"5,000 - 6,000"` → midpoint = **€5,500**
- `"10,000+"` → takes the number = **€10,000**

---

## Key Assumptions & Defaults

| Assumption | Value | Notes |
|------------|-------|-------|
| `hasMovedContributions` | `false` | We don't ask this question — assumed not moved |
| `hasOccupationalDisability` | `false` | Default for Stage/Orchestra |
| Default age if not provided | 40 | Fallback when no DOB given |
| Default user type | `insured_person` | vs. widow or orphan |
| Consecutive months gap tolerance | 1 month | Jobs with ≤1 month gap are treated as consecutive |
| Retirement age | 67 | Used for Stage/Orchestra "too old" condition |
| Legacy flat rate | €50/month | Only used when no salary/period data is available |

---

## Questions for Validation

1. **Are the contribution rates correct?** DRV = 9.3%, VBLklassik = 1.81%, VddB/VddKO = 4.5%
2. **Are the yearly salary caps accurate?** (2018: €6,500 West / €5,800 East → 2025: €8,050 unified)
3. **Is the 60-month total / 36-month consecutive threshold right** for post-2018?
4. **East Germany exclusion** — is it correct that East Germany periods are not refundable for supplementary?
5. **Stage/Orchestra conditions** — are the 4 employment-end conditions complete and correct?
6. **No VAT on supplementary refunds** — confirmed?
7. **The €50/month fallback** — is this still appropriate for cases where we don't have salary data, or should we remove it?
8. **Should `hasMovedContributions` default to false**, or should we ask users this question?
9. **2025 East cap is `null`** — does this mean unified caps now apply, or should there be a separate East cap?
