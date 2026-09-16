#!/usr/bin/env python3
"""Generate the seanswarm architecture diagram (PNG + SVG).

Brand palette: graphite #17191C background, amber #FFB020 accent.
Run:  python tools/make-architecture.py  (from the repo root)
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, RegularPolygon

BG = "#17191C"
PANEL = "#1F2328"
PANEL_EDGE = "#3A4048"
STEP_BG = "#262B31"
STEP_EDGE = "#4A5058"
AMBER = "#FFB020"
TEXT = "#F2F3F4"
GRAY = "#9AA0A6"
GRAY_DIM = "#6E747B"
ARROW = "#5A6169"

W, H = 1600, 1000
fig = plt.figure(figsize=(16, 10), dpi=160)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.set_axis_off()
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)


def box(x, y, w, h, fc, ec, lw=1.5, r=14, z=2):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                       linewidth=lw, edgecolor=ec, facecolor=fc, zorder=z)
    ax.add_patch(p)


def txt(x, y, s, size=11, color=TEXT, weight="normal", ha="center", z=5):
    ax.text(x, y, s, fontsize=size, color=color, fontweight=weight,
            ha=ha, va="center", zorder=z)


def arrow(x1, y1, x2, y2, lw=1.4, ms=12, z=4):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=ms,
                        color=ARROW, linewidth=lw, zorder=z, shrinkA=0, shrinkB=0)
    ax.add_patch(a)


def hexagon(cx, cy, r, fc, ec, lw=1.6, z=6):
    p = RegularPolygon((cx, cy), numVertices=6, radius=r, orientation=0,
                       facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z)
    ax.add_patch(p)


# ---------------- title ----------------
txt(60, 962, "seanswarm", 17, AMBER, "bold", ha="left")
txt(240, 962, "· multi-agent architecture at a glance", 13.5, GRAY, ha="left")

# ---------------- supervisor ----------------
box(430, 838, 740, 84, "#20242A", AMBER, 2.2)
hexagon(478, 892, 13, AMBER, AMBER)
hexagon(464, 868, 13, "none", AMBER)
hexagon(492, 868, 13, "none", AMBER)
txt(800, 894, "MAIN SESSION — SUPERVISOR", 18, TEXT, "bold")
txt(800, 864, "plans · dispatches (parallel) · merges · arbitrates · final check", 11.5, GRAY)

# ---------------- dispatch bus ----------------
arrow(800, 838, 800, 806)
ax.plot([230, 1370], [806, 806], color=ARROW, lw=1.4, zorder=4)
for cx in (230, 610, 990, 1370):
    arrow(cx, 806, cx, 792)
txt(232, 824, "dispatch — parallel, one message", 10.5, GRAY_DIM, ha="left")
txt(1368, 824, "returns — summaries only", 10.5, GRAY_DIM, ha="right")

# ---------------- four scenario cards ----------------
CARD_W = 340
CARD_Y0, CARD_Y1 = 452, 792
STEP_H = 50
STEP_YS = [686, 622, 558, 494]

cols = [
    dict(cx=230, title="WEB RESEARCH", skill="web-research-fanout",
         roles="researcher × N",
         steps=["dispatch N lanes", "claims table", "adversarial lane",
                "cross-family\narbitration"]),
    dict(cx=610, title="DOCUMENT READING", skill="dual-read",
         roles="researcher · main agent",
         steps=["main reads", "sub-agent reads\nindependently", "cross-compare",
                "match / addition\n/ conflict"]),
    dict(cx=990, title="DEV DELIVERY", skill="dev-delivery",
         roles="reviewer · worker-coder",
         steps=["QA-first checklist", "single writer\nimplements",
                "read-only review\n(diff only)", "fail-closed accept"]),
    dict(cx=1370, title="VISUAL ACCEPTANCE", skill="visual-judge",
         roles="visual-judge · screenshot gate",
         steps=["render pages", "screenshot each", "judge pass / fail",
                "fix → re-render\n→ re-judge"]),
]

for c in cols:
    cx = c["cx"]
    x0 = cx - CARD_W / 2
    box(x0, CARD_Y0, CARD_W, CARD_Y1 - CARD_Y0, PANEL, PANEL_EDGE, 1.4, 16)
    hexagon(x0 + 30, 764, 11, AMBER, AMBER)
    txt(x0 + 52, 764, c["title"], 13.5, TEXT, "bold", ha="left")
    txt(x0 + 52, 744, c["skill"], 9.5, GRAY, ha="left")
    txt(x0 + 52, 727, c["roles"], 9.5, AMBER, ha="left")
    for i, s in enumerate(c["steps"]):
        y = STEP_YS[i]
        box(cx - 150, y - STEP_H / 2, 300, STEP_H, STEP_BG, STEP_EDGE, 1.2, 10)
        txt(cx, y, s, 11, TEXT)
        if i:
            arrow(cx, STEP_YS[i - 1] - STEP_H / 2, cx, y + STEP_H / 2 + 2, ms=10, lw=1.2)

# ---------------- convergence + gates ----------------
for cx in (230, 610, 990, 1370):
    arrow(cx, CARD_Y0, cx, 446)
ax.plot([230, 1370], [446, 446], color=ARROW, lw=1.4, zorder=4)
arrow(800, 446, 800, 428)
box(430, 336, 740, 88, "#20242A", AMBER, 2.2)
txt(800, 394, "EVIDENCE GATES · fail-closed", 15, TEXT, "bold")
txt(800, 364, "claims · diffs · screenshots · verdicts — unknown counts as fail", 10.5, GRAY)
arrow(800, 336, 800, 322)
box(660, 278, 280, 44, AMBER, AMBER, 1.5, 12)
txt(800, 300, "DELIVERY", 13, BG, "bold")

# ---------------- footer: channel ladder ----------------
box(60, 56, 1480, 96, "#1B1F24", "#2E343B", 1.2, 12)
txt(100, 126, "CHANNEL LADDER — when a research site blocks you", 11, GRAY, "bold", ha="left")
txt(100, 94, "L0 official API → L1 search-index snapshot → L2 fetch-hard script → L3 change exit IP → L4 real browser",
    10.5, TEXT, ha="left")
txt(100, 70, "escalate one rung at a time — never retry a blocked rung", 10, GRAY_DIM, ha="left")

# ---------------- save ----------------
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.abspath(os.path.join(here, "..", "assets"))
os.makedirs(out, exist_ok=True)
png = os.path.join(out, "architecture.png")
svg = os.path.join(out, "architecture.svg")
fig.savefig(png, facecolor=BG)
fig.savefig(svg, facecolor=BG, format="svg")
print("saved:", png)
print("saved:", svg)
