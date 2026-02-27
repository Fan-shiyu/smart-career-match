# Job Intelligence Platform

AI-powered job search and decision intelligence platform designed to transform how professionals evaluate career opportunities.


## Overview

Job Intelligence is a structured job evaluation platform that moves beyond traditional job boards.

Instead of presenting unstructured listings, the platform aggregates job data, enriches it with AI-driven analysis, and converts it into structured intelligence. Users can evaluate opportunities based on skill fit, visa feasibility, commute impact, benefits, and career alignment — all in a single interface.

The platform is built for serious professionals who want clarity, transparency, and measurable decision support when navigating competitive job markets.


## Market Positioning

Most job platforms focus on volume and browsing.

Job Intelligence focuses on:

- Structured data extraction
- Measurable job–candidate alignment
- Visa intelligence (Netherlands IND integration)
- Commute and lifestyle impact
- Decision-ready exports for professional comparison

The result is a tool that enables users to make informed, data-driven career decisions rather than relying on manual reading and guesswork.


## Core Capabilities

### Multi-Source Job Aggregation

- Adzuna API
- Greenhouse public job board API
- Lever postings API
- Company-direct ingestion (optional)

All listings are normalized into a unified schema.


### Full Job Description Retrieval

- No truncated descriptions
- Automatic detail-page retrieval when required
- Full-text storage for enrichment and matching

This ensures AI analysis is performed on complete job data.


### AI Job Enrichment

Structured extraction from full job descriptions, including:

- Hard skills
- Software tools
- Cloud platforms
- Years of experience
- Education requirements
- Required languages
- Benefits (learning budget, pension, transport allowance, etc.)
- Visa sponsorship mentions

Enrichment results are cached and versioned using description hashes.

### CV Matching Engine

Users upload their CV (PDF/DOCX) to receive:

- Overall match score (0–100)
- Skill overlap breakdown
- Matched skills
- Missing skills
- Structured match explanation

Matching is computed only for shortlisted jobs to maintain performance and scalability.


### Visa Intelligence (Netherlands)

- Integration with IND recognized sponsor database
- Deterministic company name normalization and matching
- Visa likelihood scoring (High / Medium / Low)
- Transparent matching logic (exact / fuzzy / alias)

Designed specifically for international professionals navigating Dutch sponsorship requirements.


### Commute Analysis

- Google Maps Distance Matrix integration
- Distance and travel time calculation
- Mode selection (driving / public transport / cycling)
- Cached per user origin for efficiency

Commute impact becomes part of the decision model.


### Excel-Only Professional Export

The platform exports structured `.xlsx` files designed for serious comparison and analysis:

- Categorized column groups
- Color-coded headers
- Frozen panes
- Filter-enabled structure
- Multiple sheets (Overview / Full Data / Skill Gap)

Exports are optimized for professional decision-making workflows.


### Job Detail Dashboard

Each job listing includes a structured intelligence dashboard:

- Overview
- Match breakdown
- Skills and requirements
- Visa and language signals
- Benefits extraction
- Commute analysis
- Full job description


### Authentication and Subscription Model

- Email-based login and registration
- Free / Pro / Premium tiers
- Role-based admin control
- Feature gating and usage tracking
