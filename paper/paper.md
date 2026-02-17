---
title: 'Berta: An open-source, modular tool for AI-enabled clinical documentation'
tags:
  - Python
  - JavaScript
  - medical documentation
  - clinical notes
  - speech-to-text
  - large language models
  - healthcare
authors:
  - name: Samridhi Vaid
    orcid: 0009-0001-2742-6808
    affiliation: 1
  - name: Mike Weldon
    affiliation: "2, 3"
  - name: Jesse Dunn
    affiliation: 3
  - name: Kevin Lonergan
    affiliation: 3
  - name: Henry Li
    affiliation: "2, 3"
  - name: Jeffrey Franc
    affiliation: "2, 3"
  - name: Mohamed Abdala
    affiliation: "1, 4, 5"
  - name: Daniel C. Baumgart
    affiliation: 1
  - name: Jake Hayward
    affiliation: "2, 3"
  - name: J Ross Mitchell
    orcid: 0000-0002-2340-4708
    corresponding: true
    affiliation: "1, 4, 5"
affiliations:
  - name: Department of Medicine, University of Alberta, Edmonton, Alberta, Canada
    index: 1
  - name: Department of Emergency Medicine, University of Alberta, Edmonton, Alberta, Canada
    index: 2
  - name: Alberta Health Services, Edmonton, Alberta, Canada
    index: 3
  - name: Department of Computer Science, University of Alberta, Edmonton, Alberta, Canada
    index: 4
  - name: Alberta Machine Intelligence Institute, Edmonton, Alberta, Canada
    index: 5
date: 16 February 2026
bibliography: paper.bib
---

# Summary

Berta is an open-source, modular platform for building and evaluating AI-enabled clinical documentation systems. Named in homage to Alberta and BERT (Bidirectional Encoder Representations from Transformers), Berta combines automatic speech recognition (ASR) with large language models (LLMs) to transcribe patient encounters and generate structured clinical notes. The system comprises a Python FastAPI [@ramirez_fastapi] backend and a Next.js frontend, and supports deployment on systems ranging from a single workstation to a GPU server in a secure virtual private cloud, to cloud environments such as Amazon Web Services.

![Berta system architecture. The system features a Next.js frontend, a Python FastAPI backend, and modular ASR and LLM components that can be deployed on-premises or in a virtual private cloud.\label{fig:architecture}](Berta_Arch.pdf)

# Statement of need

Emergency physicians in developed countries typically spend more than 40% of their time on documentation and less than 30% on direct patient care [@hill2013clicks]. This administrative burden is a major contributor to physician burnout [@shanafelt2016relationship], reduced career satisfaction [@melnick2021analysis], and workforce attrition. The financial impact is substantial, with burnout-related physician turnover costing an estimated US$4.6 billion annually in the United States [@han2019burnout], while emergency medicine reports burnout rates of up to 86% among physicians in developed countries [@lim2023emergency]. The consequences extend throughout healthcare systems: Canada experienced more than 1,200 temporary emergency department closures in 2023 alone, disproportionately affecting rural and underserved communities [@ctv2023three].

Electronic transcription solutions (scribes) can reduce documentation time by up to 35% [@hess2015scribe] and increase patient throughput by 10--20% [@walker2019impact]. However, current commercial AI scribe solutions often operate as expensive proprietary "black-box" systems with limited transparency [@kim2025transparency], costing several hundred dollars per physician per month [@heidi_blog_cost; @scribeberry_cost] and restricting organizational control over data governance and system customization [@england2025guidance]. Healthcare organizations, particularly those in resource-constrained environments, lack accessible tools to evaluate, customize, and deploy AI documentation systems according to their specific clinical workflows and regulatory requirements [@wong2025bridging].

Berta addresses this gap by providing an open-source modular platform that enables healthcare organizations to build, test, and deploy AI-powered clinical documentation systems with full transparency, data sovereignty, and cost-effective scalability, supporting informed decision-making about this rapidly evolving technology.

# State of the field

Commercial AI scribe products are closed-source, subscription-based services with vendor-reported estimates ranging from US$99 to over US$600 per physician per month [@heidi_blog_cost; @scribeberry_cost]. These systems offer polished integrations with electronic health records but provide no access to source code, limit customization of note templates and model selection, and require organizations to route clinical audio through third-party infrastructure. Their proprietary nature makes independent auditing, bias evaluation, and regulatory compliance verification difficult [@kim2025transparency].

Berta is not intended to compete with commercial AI scribe products. Rather, it is intended to help organizations evaluate AI-enabled clinical documentation systems and gather information to guide future decision-making. To our knowledge, no comparable open-source tool exists that provides a complete, deployment-ready platform for AI-enabled clinical documentation with modular ASR and LLM backends.

# Software design

Berta comprises a Next.js frontend and a FastAPI [@ramirez_fastapi] backend that exposes RESTful APIs for application logic, data processing, and system integration (\autoref{fig:architecture}). In routine use, clinicians create a session in the web application and record or upload audio from a patient encounter. The system transcribes speech with an ASR model and then uses an LLM to generate a structured draft clinical note from the transcript using configurable note templates (e.g., full visit note, narrative, handover summary); users can also create and save custom templates. Clinicians review and edit the generated note before transferring it to their electronic health record.

The platform adopts a modular adapter pattern across its ASR and LLM components. Supported ASR backends include WhisperX [@bain2023whisperx], OpenAI Whisper [@radford2023robust], NVIDIA Parakeet via MLX [@parakeet_mlx_impl; @mlx2023; @parakeet_tdt_0_6b_v2_nvidia], and Amazon Transcribe [@aws_transcribe_site]; supported LLM backends include local engines (Ollama [@ollama_github], vLLM [@kwon2023efficient], LM Studio [@lm_studio_site]) and commercial endpoints (OpenAI API [@openai_api_platform], Amazon Bedrock [@aws_bedrock_site]). This modular design allows organizations to interchange backends without modifying application code. Clinicians can customize note templates and prompts to match their charting preferences, and all data can be retained on-premises or within a chosen cloud environment, giving organizations full control over data sovereignty.

# Research impact statement

A closed-source deployment of the platform underlying Berta has been operational at Alberta Health Services (AHS) since November 2024. During the pilot period, the system was used in 22,148 sessions by 198 emergency physicians across 105 healthcare facilities in Alberta, Canada, representing a mix of urban and rural settings. Approximately 42% of users customized at least one document template to align with their individual charting preferences. Based on observed usage, the average operating cost of delivering the application was less than US$30 per physician per month, demonstrating that high-volume provincial-scale clinical use can be sustained at relatively low per-physician cost. Based on pilot results, AHS expanded access and has since invited over 1,600 emergency department physicians.

# AI usage disclosure

Claude Code (Anthropic Claude Opus 4.5 and 4.6) and ChatGPT (OpenAI GPT-4o) were used for code assistance, debugging, and test generation during development. All AI-generated code was reviewed and validated by the development team. Claude (Anthropic) was used to assist with structuring and reviewing drafts of this paper. The final text was written and verified by the authors.

# Acknowledgements

This work was supported by the Canadian Medical Association, MD Financial Management, and Scotiabank through the Health Care Unburdened Grant program. We acknowledge the support provided by the Canadian Institute for Advanced Research, the University Hospital Foundation, Alberta Health Services, Amazon Web Services, and Denvr Dataworks. This project uses third-party libraries and models, including WhisperX (BSD 2-Clause), Meta Llama 3 (Meta Llama 3 Community License), NVIDIA Parakeet (CC-BY-4.0), vLLM (Apache 2.0), and Ollama (MIT License).

# References
