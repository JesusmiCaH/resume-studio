"use client";

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import { FaGithub, FaLink, FaLinkedin, FaLocationDot, FaPhone, FaRegEnvelope } from "react-icons/fa6";
import type { IconType } from "react-icons";

type Template = "Scholar" | "Modern" | "Compact";
type PageSize = "letter" | "a4";
type Locale = "en" | "zh";
type SectionKey = "profile" | "education" | "experience" | "projects" | "publications" | "skills";
type StatusKey = "loaded" | "restored" | "readError" | "saving" | "saved" | "exported" | "imported" | "importError" | "reset";

type ResumeItem = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  date: string;
  bullets: string[];
};

type ResumeData = {
  profile: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    github: string;
    linkedin: string;
    updated: string;
  };
  education: ResumeItem[];
  experience: ResumeItem[];
  projects: ResumeItem[];
  publications: ResumeItem[];
  skills: ResumeItem[];
};

const translations = {
  en: {
    sectionLabels: { profile: "Profile", education: "Education", experience: "Experience", projects: "Projects", publications: "Publications", skills: "Skills" },
    status: { loaded: "Previous resume loaded", restored: "Last edit restored", readError: "Local draft could not be read", saving: "Saving…", saved: "Autosaved", exported: "Data exported", imported: "Data imported", importError: "Import failed: invalid JSON", reset: "Defaults restored" },
    personalWorkspace: "PERSONAL WORKSPACE",
    language: "Interface language",
    reset: "Reset",
    importJson: "Import JSON",
    exportJson: "Export JSON",
    exportPdf: "Export PDF",
    content: "CONTENT",
    editResume: "Edit resume",
    resumeSections: "Resume sections",
    localOnly: "Stored on this device",
    localOnlyBody: "Your resume content is never uploaded to the server.",
    livePreview: "LIVE PREVIEW",
    liveLayout: "Live layout",
    fitsPage: "Fits one page",
    overflowsPage: "Content exceeds one page",
    paper: "Paper",
    zoom: "Zoom",
    pdfTemplates: "PDF templates",
    templateDescriptions: { Scholar: "Academic classic", Modern: "Modern research", Compact: "Compact one-page" },
    printHint: "Choose “Save as PDF” in the system print dialog. Your template and paper settings will be preserved.",
    profileFields: { name: "Name", headline: "Research focus / professional title", email: "Email", phone: "Phone", location: "Location", website: "Personal website", github: "GitHub", linkedin: "LinkedIn", updated: "Updated" },
    itemFields: { title: "Title", publicationTitle: "Publication title", category: "Category", organization: "Organization / subtitle", authors: "Authors", skillList: "Skills (separate with ·)", location: "Location / status", date: "Date / venue", bullets: "Highlights (one per line)" },
    newItem: { education: "New institution", experience: "New role", projects: "New project", publications: "New publication", skills: "New skill group" },
    moveUp: "Move up",
    moveDown: "Move down",
    delete: "Delete",
    add: "Add",
    confirmReset: "Restore the original imported resume? Your current edits will be replaced.",
  },
  zh: {
    sectionLabels: { profile: "个人信息", education: "教育经历", experience: "工作经历", projects: "项目经历", publications: "论文发表", skills: "技能方向" },
    status: { loaded: "已载入旧简历", restored: "已恢复上次编辑", readError: "本地草稿无法读取", saving: "保存中…", saved: "已自动保存", exported: "数据已导出", imported: "数据已导入", importError: "导入失败：JSON 格式不正确", reset: "已恢复初始内容" },
    personalWorkspace: "个人工作台",
    language: "界面语言",
    reset: "恢复初始",
    importJson: "导入 JSON",
    exportJson: "导出 JSON",
    exportPdf: "导出 PDF",
    content: "内容",
    editResume: "编辑简历",
    resumeSections: "简历区块",
    localOnly: "仅保存在本机",
    localOnlyBody: "你的简历内容不会上传到服务器。",
    livePreview: "实时预览",
    liveLayout: "实时排版",
    fitsPage: "适合一页",
    overflowsPage: "内容超出一页",
    paper: "纸张",
    zoom: "缩放",
    pdfTemplates: "PDF 模板",
    templateDescriptions: { Scholar: "学术经典", Modern: "现代研究", Compact: "紧凑单页" },
    printHint: "点击“导出 PDF”后，在系统窗口中选择“存储为 PDF”。模板与纸张设置会保留。",
    profileFields: { name: "姓名", headline: "研究方向 / 职业标题", email: "邮箱", phone: "电话", location: "所在地", website: "个人主页", github: "GitHub", linkedin: "LinkedIn", updated: "更新日期" },
    itemFields: { title: "标题", publicationTitle: "论文标题", category: "类别", organization: "机构 / 副标题", authors: "作者", skillList: "技能（使用 · 分隔）", location: "地点 / 状态", date: "日期 / 会议信息", bullets: "要点（每行一条）" },
    newItem: { education: "新学校", experience: "新职位", projects: "新项目", publications: "新论文", skills: "新技能类别" },
    moveUp: "上移",
    moveDown: "下移",
    delete: "删除",
    add: "添加",
    confirmReset: "恢复为从旧简历导入的初始内容？当前修改会被覆盖。",
  },
};

const tabs: SectionKey[] = ["profile", "education", "experience", "projects", "publications", "skills"];
const resumeContentVersion = 10;

const jhuExperience: ResumeItem = {
  id: "exp-jhu",
  title: "Research Assistant · Advisor: Prof. Anand Bhattad",
  subtitle: "Johns Hopkins University",
  location: "Remote",
  date: "Sep 2025 — Present",
  bullets: [
    "Designed a ViT-based image encoder that disentangles a photo into illumination (extrinsic) and scene content (intrinsic), with a decoder that reconstructs accurate images from combined representations.",
    "Designed a DiT-based generative pipeline that takes lighting as a prompt and reference scene content as control, achieving high-quality vivid images.",
  ],
};

const teraResearcherExperience: ResumeItem = {
  id: "exp-tera-researcher",
  title: "3D Vision Researcher",
  subtitle: "Tera AI",
  location: "Remote",
  date: "Feb 2026 — Aug 2026",
  bullets: [
    "Built a geometry-guided data pipeline to derive high-confidence geometric pseudo-labels for dense image correspondence from internally collected flight video and prior scene geometry, supporting model fine-tuning and held-out evaluation.",
    "Evaluated and fine-tuned UFM as an efficient frame-to-frame correspondence frontend, improving robustness for long-horizon visual localization under practical latency constraints.",
    "Developed a flight-replay diagnostic workflow that connected correspondence behavior to GPS-referenced trajectory error, isolating failures in matching, downstream pose processing, and geographic priors to guide targeted iteration.",
    "Implemented and benchmarked 3D reconstruction pipelines spanning classical SfM, feed-forward 3D models, and Gaussian Splatting on internal flight video; evaluated Sim(3)-aligned point clouds by point-to-mesh distance and novel-view quality by held-out photometric error.",
  ],
};

const teraInternExperience: ResumeItem = {
  id: "exp-tera-intern",
  title: "Research Intern — Part-time",
  subtitle: "Tera AI",
  location: "Remote",
  date: "Aug 2025 — Feb 2026",
  bullets: [
    "Prototyped windowed deployment of STream3R for long-horizon flight video; identified memory growth and clip-level latency as blockers for real-time, edge-constrained localization, motivating an online correspondence-based frontend.",
  ],
};

const hkustExperience: ResumeItem = {
  id: "exp-hkust-ra",
  title: "Research Assistant · Advisor: Prof. Haoang Li",
  subtitle: "The Hong Kong University of Science and Technology (Guangzhou)",
  location: "Remote",
  date: "Nov 2023 — Jun 2024",
  bullets: [
    "Developed an animatable human Gaussian Splatting pipeline using a canonical avatar representation and SMPL-driven deformation across per-frame body poses.",
    "Co-designed and implemented a correspondence-guided feature-consistency loss using RoMA matches and DINO features across viewpoints and body poses, complementing photometric supervision to enforce part-level appearance consistency under articulated motion.",
  ],
};

const initialResume: ResumeData = {
  profile: {
    name: "Chenghao (Tommy) Jiang",
    headline: "3D Computer Vision · SLAM · Generative Models",
    email: "cjiang239@wisc.edu",
    phone: "(608) 867-9882",
    location: "Madison, Wisconsin",
    website: "jesusmicah.github.io",
    github: "JesusmiCaH",
    linkedin: "Chenghao-Jiang",
    updated: "Aug 2026",
  },
  education: [
    { id: "edu-uw", title: "University of Wisconsin–Madison", subtitle: "MS in Electrical and Computer Engineering", location: "Madison, WI", date: "Sep 2024 — Dec 2025", bullets: [] },
    { id: "edu-uom", title: "University of Manchester", subtitle: "MS in Communication and Signal Processing", location: "Manchester, UK", date: "Sep 2022 — Dec 2023", bullets: ["GPA: 75.5/100 · Distinction Honor"] },
    { id: "edu-ccust", title: "Changchun University of Science and Technology", subtitle: "BEng in Optoelectronic Information Science and Engineering", location: "Changchun, China", date: "Sep 2018 — Jun 2022", bullets: ["GPA: 3.86/5.00 · Rank: 10/221"] },
  ],
  experience: [
    jhuExperience,
    teraResearcherExperience,
    teraInternExperience,
    hkustExperience,
  ],
  projects: [
    { id: "project-sharp", title: "Privacy-Aware Sensor Data for Cooperative Perception", subtitle: "Supervised by Prof. Akarsh Prabhakara", location: "Madison, WI", date: "Jun 2025 — Jul 2025", bullets: ["Explored cooperative SLAM under privacy constraints using SHARP, transmitting pointmap-based novel-view renderings instead of raw images.", "Evaluated VGGT on the OPV2V dataset across ego-only, SHARP-generated, and raw multi-agent inputs.", "Extended the CARLA simulation in OPV2V with depth sensing for point-cloud rescaling and downstream 3D recovery."] },
  ],
  publications: [
    { id: "pub-hotmobile", title: "Privacy-Aware Sharing of Raw Spatial Sensor Data for Cooperative Perception", subtitle: "Bangya Liu, Chenghao Jiang, Chengpo Yan, Suman Banerjee, Akarsh Prabhakara", location: "Under review", date: "HotMobile 2026", bullets: [] },
  ],
  skills: [
    { id: "skill-stack", title: "Programming", subtitle: "Python · CUDA · PyTorch · LaTeX", location: "", date: "", bullets: [] },
    { id: "skill-research", title: "Research", subtitle: "3D reconstruction · SLAM · Gaussian Splatting · Diffusion Models · VLMs", location: "", date: "", bullets: [] },
  ],
};

const cloneInitial = () => JSON.parse(JSON.stringify(initialResume)) as ResumeData;
const makeId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function migrateSavedResume(saved: { resume?: ResumeData; contentVersion?: number }) {
  if (!saved.resume) return cloneInitial();
  if ((saved.contentVersion ?? 1) >= resumeContentVersion) return saved.resume;

  const next = JSON.parse(JSON.stringify(saved.resume)) as ResumeData;
  const savedVersion = saved.contentVersion ?? 1;
  if (savedVersion < 8) {
    const teraIds = ["exp-tera", "exp-tera-fulltime", "exp-tera-parttime", "exp-tera-researcher", "exp-tera-intern"];
    const teraIndex = next.experience.findIndex((item) => teraIds.includes(item.id));
    next.experience = next.experience.filter((item) => !teraIds.includes(item.id));
    next.experience.splice(
      teraIndex >= 0 ? teraIndex : next.experience.length,
      0,
      JSON.parse(JSON.stringify(teraResearcherExperience)),
      JSON.parse(JSON.stringify(teraInternExperience)),
    );
  }
  if (savedVersion < 9) {
    const jhu = next.experience.find((item) => item.id === "exp-jhu");
    if (jhu) jhu.title = jhuExperience.title;
    if (!next.experience.some((item) => item.id === hkustExperience.id)) {
      const teraInternIndex = next.experience.findIndex((item) => item.id === teraInternExperience.id);
      next.experience.splice(
        teraInternIndex >= 0 ? teraInternIndex + 1 : next.experience.length,
        0,
        JSON.parse(JSON.stringify(hkustExperience)),
      );
    }
  }
  if (savedVersion < 10) {
    next.projects = next.projects.filter((item) => item.id !== "project-roma");
    const uwMadison = next.education.find((item) => item.id === "edu-uw");
    if (uwMadison) uwMadison.bullets = uwMadison.bullets.filter((bullet) => !/^Coursework:/i.test(bullet.trim()));
    const programming = next.skills.find((item) => item.id === "skill-stack");
    if (programming) programming.title = "Programming";
    delete (next.profile as ResumeData["profile"] & { summary?: string }).summary;
  }
  if (next.profile.updated === "Dec 2025") next.profile.updated = "Aug 2026";
  return next;
}

export function ResumeBuilder({ initialTemplate = "Scholar", initialPageSize = "letter" }: { initialTemplate?: Template; initialPageSize?: PageSize }) {
  const [resume, setResume] = useState<ResumeData>(cloneInitial);
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);
  const [locale, setLocale] = useState<Locale>("en");
  const [zoom, setZoom] = useState(90);
  const [pageOverflow, setPageOverflow] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<StatusKey>("loaded");
  const fileInput = useRef<HTMLInputElement>(null);
  const copy = translations[locale];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tommy-resume-studio-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.resume) setResume(migrateSavedResume(parsed));
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.pageSize) setPageSize(parsed.pageSize);
        if (parsed.locale === "en" || parsed.locale === "zh") setLocale(parsed.locale);
        setStatus("restored");
      }
      const params = new URLSearchParams(window.location.search);
      const requestedTemplate = params.get("template");
      const requestedPage = params.get("page");
      if (["Scholar", "Modern", "Compact"].includes(requestedTemplate || "")) setTemplate(requestedTemplate as Template);
      if (["letter", "a4"].includes(requestedPage || "")) setPageSize(requestedPage as PageSize);
    } catch {
      setStatus("readError");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("tommy-resume-studio-v1", JSON.stringify({ resume, template, pageSize, locale, contentVersion: resumeContentVersion }));
    const timer = window.setTimeout(() => setStatus("saved"), 250);
    return () => window.clearTimeout(timer);
  }, [resume, template, pageSize, locale, ready]);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const updateProfile = (field: keyof ResumeData["profile"], value: string) => {
    setResume((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
    setStatus("saving");
  };

  const updateItem = (section: Exclude<SectionKey, "profile">, id: string, field: keyof ResumeItem, value: string | string[]) => {
    setResume((current) => ({ ...current, [section]: current[section].map((item) => item.id === id ? { ...item, [field]: value } : item) }));
    setStatus("saving");
  };

  const addItem = (section: Exclude<SectionKey, "profile">) => {
    setResume((current) => ({ ...current, [section]: [...current[section], { id: makeId(), title: copy.newItem[section], subtitle: "", location: "", date: "", bullets: [] }] }));
  };

  const removeItem = (section: Exclude<SectionKey, "profile">, id: string) => {
    setResume((current) => ({ ...current, [section]: current[section].filter((item) => item.id !== id) }));
  };

  const moveItem = (section: Exclude<SectionKey, "profile">, index: number, direction: -1 | 1) => {
    setResume((current) => {
      const items = [...current[section]];
      const next = index + direction;
      if (next < 0 || next >= items.length) return current;
      [items[index], items[next]] = [items[next], items[index]];
      return { ...current, [section]: items };
    });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "chenghao-jiang-resume.json";
    link.click();
    URL.revokeObjectURL(href);
    setStatus("exported");
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed.profile || !parsed.education || !parsed.experience) throw new Error("Invalid resume");
        setResume(parsed);
        setStatus("imported");
      } catch {
        setStatus("importError");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const resetResume = () => {
    if (window.confirm(copy.confirmReset)) {
      setResume(cloneInitial());
      setTemplate("Scholar");
      setPageSize("letter");
      setStatus("reset");
    }
  };

  return (
    <>
    <style>{`@page { size: ${pageSize === "a4" ? "A4" : "Letter"}; margin: 0; }`}</style>
    <main className="studio-shell">
      <header className="studio-header no-print">
        <div className="brand-mark">T</div>
        <div>
          <p className="eyebrow">{copy.personalWorkspace}</p>
          <h1>Resume Studio</h1>
        </div>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label={copy.language}>
            <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>EN</button>
            <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")}>中文</button>
          </div>
          <span className="saved-dot">{copy.status[status]}</span>
          <button className="text-button" onClick={resetResume}>{copy.reset}</button>
          <button className="secondary-button" onClick={() => fileInput.current?.click()}>{copy.importJson}</button>
          <button className="secondary-button" onClick={exportData}>{copy.exportJson}</button>
          <button className="primary-button" onClick={() => window.print()}>{copy.exportPdf}</button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="application/json" onChange={importData} />
        </div>
      </header>

      <section className="studio-workspace">
        <aside className="editor-panel no-print">
          <div className="panel-heading">
            <div><p className="eyebrow">{copy.content}</p><h2>{copy.editResume}</h2></div>
            <span className="step-count">{String(tabs.indexOf(activeSection) + 1).padStart(2, "0")} / 06</span>
          </div>
          <nav className="section-tabs" aria-label={copy.resumeSections}>
            {tabs.map((tab) => <button key={tab} className={activeSection === tab ? "active" : ""} onClick={() => setActiveSection(tab)}>{copy.sectionLabels[tab]}</button>)}
          </nav>

          {activeSection === "profile" ? (
            <ProfileEditor profile={resume.profile} locale={locale} onChange={updateProfile} />
          ) : (
            <ItemsEditor
              section={activeSection}
              locale={locale}
              items={resume[activeSection]}
              onAdd={() => addItem(activeSection)}
              onRemove={(id) => removeItem(activeSection, id)}
              onMove={(index, direction) => moveItem(activeSection, index, direction)}
              onChange={(id, field, value) => updateItem(activeSection, id, field, value)}
            />
          )}
          <div className="privacy-note"><span>●</span><p><strong>{copy.localOnly}</strong><br />{copy.localOnlyBody}</p></div>
        </aside>

        <section className="preview-panel">
          <div className="preview-toolbar no-print">
            <div><p className="eyebrow">{copy.livePreview}</p><strong>{pageSize === "letter" ? "US Letter" : "A4"} · {copy.liveLayout}<span className={`page-fit-badge ${pageOverflow ? "overflowing" : "fits"}`}>{pageOverflow ? copy.overflowsPage : copy.fitsPage}</span></strong></div>
            <div className="toolbar-controls">
              <label className="select-control"><span>{copy.paper}</span><select value={pageSize} onChange={(event) => setPageSize(event.target.value as PageSize)}><option value="letter">Letter</option><option value="a4">A4</option></select></label>
              <label className="select-control zoom-control"><span>{copy.zoom}</span><input type="range" min="60" max="110" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><b>{zoom}%</b></label>
            </div>
          </div>
          <div className="template-rail no-print" aria-label={copy.pdfTemplates}>
            {(["Scholar", "Modern", "Compact"] as Template[]).map((item) => (
              <button key={item} className={template === item ? "active" : ""} onClick={() => setTemplate(item)}><span className={`template-swatch swatch-${item.toLowerCase()}`} /><span><strong>{item}</strong><small>{copy.templateDescriptions[item]}</small></span></button>
            ))}
          </div>

          <div className="paper-stage">
            <ResumePaper resume={resume} template={template} pageSize={pageSize} zoom={zoom} onOverflowChange={setPageOverflow} />
          </div>
          <p className="print-hint no-print">{copy.printHint}</p>
        </section>
      </section>
    </main>
    </>
  );
}

function ProfileEditor({ profile, locale, onChange }: { profile: ResumeData["profile"]; locale: Locale; onChange: (field: keyof ResumeData["profile"], value: string) => void }) {
  const labels = translations[locale].profileFields;
  const fields: Array<[keyof typeof profile, string, "input" | "textarea"]> = [
    ["name", labels.name, "input"], ["headline", labels.headline, "input"], ["email", labels.email, "input"], ["phone", labels.phone, "input"], ["location", labels.location, "input"], ["website", labels.website, "input"], ["github", labels.github, "input"], ["linkedin", labels.linkedin, "input"], ["updated", labels.updated, "input"],
  ];
  return <div className="form-stack profile-grid">{fields.map(([field, label, type]) => <label key={field} className={field === "headline" ? "field-wide" : ""}><span>{label}</span>{type === "textarea" ? <textarea rows={4} value={profile[field]} onChange={(event) => onChange(field, event.target.value)} /> : <input value={profile[field]} onChange={(event) => onChange(field, event.target.value)} />}</label>)}</div>;
}

function ItemsEditor({ section, locale, items, onAdd, onRemove, onMove, onChange }: { section: Exclude<SectionKey, "profile">; locale: Locale; items: ResumeItem[]; onAdd: () => void; onRemove: (id: string) => void; onMove: (index: number, direction: -1 | 1) => void; onChange: (id: string, field: keyof ResumeItem, value: string | string[]) => void }) {
  const copy = translations[locale];
  return <div className="items-editor">
    {items.map((item, index) => <article className="item-card" key={item.id}>
      <div className="item-card-heading"><span>{String(index + 1).padStart(2, "0")}</span><div><button aria-label={copy.moveUp} disabled={index === 0} onClick={() => onMove(index, -1)}>↑</button><button aria-label={copy.moveDown} disabled={index === items.length - 1} onClick={() => onMove(index, 1)}>↓</button><button className="danger" onClick={() => onRemove(item.id)}>{copy.delete}</button></div></div>
      <div className="form-stack compact-form">
        <label className="field-wide"><span>{section === "publications" ? copy.itemFields.publicationTitle : section === "skills" ? copy.itemFields.category : copy.itemFields.title}</span><input value={item.title} onChange={(e) => onChange(item.id, "title", e.target.value)} /></label>
        <label className="field-wide"><span>{section === "publications" ? copy.itemFields.authors : section === "skills" ? copy.itemFields.skillList : copy.itemFields.organization}</span><input value={item.subtitle} onChange={(e) => onChange(item.id, "subtitle", e.target.value)} /></label>
        <label><span>{copy.itemFields.location}</span><input value={item.location} onChange={(e) => onChange(item.id, "location", e.target.value)} /></label>
        <label><span>{copy.itemFields.date}</span><input value={item.date} onChange={(e) => onChange(item.id, "date", e.target.value)} /></label>
        {section !== "skills" && section !== "publications" && <label className="field-wide"><span>{copy.itemFields.bullets}</span><textarea rows={5} value={item.bullets.join("\n")} onChange={(e) => onChange(item.id, "bullets", e.target.value.split("\n"))} /></label>}
      </div>
    </article>)}
    <button className="add-button" onClick={onAdd}>＋ {copy.add} {copy.sectionLabels[section]}</button>
  </div>;
}

function ResumePaper({ resume, template, pageSize, zoom, onOverflowChange }: { resume: ResumeData; template: Template; pageSize: PageSize; zoom: number; onOverflowChange: (overflowing: boolean) => void }) {
  const p = resume.profile;
  const paperRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    let active = true;
    const checkOverflow = () => {
      if (active) onOverflowChange(paper.scrollHeight > paper.clientHeight + 1);
    };
    const frame = window.requestAnimationFrame(checkOverflow);
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(paper);
    document.fonts.ready.then(checkOverflow);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [resume, template, pageSize, onOverflowChange]);

  return <article ref={paperRef} className={`resume-paper theme-${template.toLowerCase()} page-${pageSize}`} style={{ "--preview-scale": zoom / 100 } as React.CSSProperties}>
    <header className="resume-header">
      <h2>{p.name}</h2>
      <p className="resume-headline">{p.headline}</p>
      <div className="resume-contact">
        <div className="contact-row">
          {p.location && <ContactItem icon={FaLocationDot}>{p.location}</ContactItem>}
          {p.email && <ContactItem icon={FaRegEnvelope} href={`mailto:${p.email.trim()}`}>{p.email}</ContactItem>}
          {p.phone && <ContactItem icon={FaPhone} href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}>{p.phone}</ContactItem>}
          {p.linkedin && <ContactItem icon={FaLinkedin} href={toProfileUrl(p.linkedin, "linkedin.com/in")}>{p.linkedin}</ContactItem>}
          {p.github && <ContactItem icon={FaGithub} href={toProfileUrl(p.github, "github.com")}>{p.github}</ContactItem>}
          {p.website && <ContactItem icon={FaLink} href={toExternalUrl(p.website)}>{p.website}</ContactItem>}
        </div>
      </div>
    </header>
    <ResumeSection title="Education"><ItemList items={resume.education} /></ResumeSection>
    <ResumeSection title="Experience"><ExperienceList items={resume.experience} /></ResumeSection>
    <ResumeSection title="Selected Projects"><ItemList items={resume.projects} /></ResumeSection>
    {resume.publications.length > 0 && <ResumeSection title="Publications"><ItemList items={resume.publications} publication /></ResumeSection>}
    {resume.skills.length > 0 && <ResumeSection title="Skills"><ItemList items={resume.skills} skills /></ResumeSection>}
  </article>;
}

function ContactItem({ icon: Icon, href, children }: { icon: IconType; href?: string; children: ReactNode }) {
  const content = <><Icon aria-hidden="true" /><span>{children}</span></>;
  return href ? <ResumeLink href={href} className="contact-item">{content}</ResumeLink> : <span className="contact-item">{content}</span>;
}

function ResumeLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
}

function toExternalUrl(value: string) {
  const clean = value.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean.replace(/^\/+/, "")}`;
}

function toProfileUrl(value: string, host: string) {
  const clean = value.trim();
  if (/^https?:\/\//i.test(clean)) return clean;
  const withoutAt = clean.replace(/^@/, "").replace(/^\/+/, "");
  if (withoutAt.toLowerCase().startsWith(`${host.toLowerCase()}/`)) return `https://${withoutAt}`;
  return `https://${host}/${withoutAt}`;
}

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="resume-section"><h3>{title}</h3>{children}</section>;
}

function ExperienceList({ items }: { items: ResumeItem[] }) {
  const groups = items.reduce<Array<{ organization: string; location: string; roles: ResumeItem[] }>>((result, item) => {
    const previous = result.at(-1);
    if (previous && previous.organization === item.subtitle && previous.location === item.location) {
      previous.roles.push(item);
    } else {
      result.push({ organization: item.subtitle, location: item.location, roles: [item] });
    }
    return result;
  }, []);

  return <>{groups.map((group) => {
    const [onlyRole] = group.roles;
    if (group.roles.length === 1) {
      return <div className="resume-entry" key={onlyRole.id}>
        <div className="entry-heading"><strong>{group.organization}</strong>{onlyRole.date && <span>{onlyRole.date}</span>}</div>
        <div className="entry-subheading"><em>{onlyRole.title}</em>{group.location && <span>{group.location}</span>}</div>
        {onlyRole.bullets.filter(Boolean).length > 0 && <ul>{onlyRole.bullets.filter(Boolean).map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}
      </div>;
    }

    return <div className="resume-entry experience-group" key={`${group.organization}-${group.roles.map((role) => role.id).join("-")}`}>
      <div className="entry-heading"><strong>{group.organization}</strong>{group.location && <span>{group.location}</span>}</div>
      {group.roles.map((role) => <div className="experience-role" key={role.id}>
        <div className="entry-subheading"><em>{role.title}</em>{role.date && <span>{role.date}</span>}</div>
        {role.bullets.filter(Boolean).length > 0 && <ul>{role.bullets.filter(Boolean).map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}
      </div>)}
    </div>;
  })}</>;
}

function ItemList({ items, publication = false, skills = false }: { items: ResumeItem[]; publication?: boolean; skills?: boolean }) {
  return <>{items.map((item) => <div className={`resume-entry ${publication ? "publication-entry" : ""} ${skills ? "skill-entry" : ""}`} key={item.id}>
    <div className="entry-heading"><strong>{item.title}</strong>{item.date && <span>{item.date}</span>}</div>
    <div className="entry-subheading"><em>{item.subtitle}</em>{item.location && <span>{item.location}</span>}</div>
    {item.bullets.filter(Boolean).length > 0 && <ul>{item.bullets.filter(Boolean).map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}
  </div>)}</>;
}
