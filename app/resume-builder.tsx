"use client";

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";

type Template = "Scholar" | "Modern" | "Compact";
type PageSize = "letter" | "a4";
type SectionKey = "profile" | "education" | "experience" | "projects" | "publications" | "skills";

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
    summary: string;
    updated: string;
  };
  education: ResumeItem[];
  experience: ResumeItem[];
  projects: ResumeItem[];
  publications: ResumeItem[];
  skills: ResumeItem[];
};

const sectionLabels: Record<SectionKey, string> = {
  profile: "个人信息",
  education: "教育经历",
  experience: "工作经历",
  projects: "项目经历",
  publications: "论文发表",
  skills: "技能方向",
};

const tabs = Object.keys(sectionLabels) as SectionKey[];

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
    summary: "Researcher building robust 3D perception and generative vision systems for real-world environments.",
    updated: "Dec 2025",
  },
  education: [
    { id: "edu-uw", title: "University of Wisconsin–Madison", subtitle: "MS in Electrical and Computer Engineering", location: "Madison, WI", date: "Sep 2024 — Dec 2025", bullets: ["Coursework: Learning-based Image Synthesis, High Performance Computing, Reinforcement Learning"] },
    { id: "edu-uom", title: "University of Manchester", subtitle: "MS in Communication and Signal Processing", location: "Manchester, UK", date: "Sep 2022 — Dec 2023", bullets: ["GPA: 75.5/100 · Distinction Honor"] },
    { id: "edu-ccust", title: "Changchun University of Science and Technology", subtitle: "BEng in Optoelectronic Information Science and Engineering", location: "Changchun, China", date: "Sep 2018 — Jun 2022", bullets: ["GPA: 3.86/5.00 · Rank: 10/221"] },
  ],
  experience: [
    { id: "exp-jhu", title: "Research Assistant", subtitle: "Johns Hopkins University", location: "Remote", date: "Sep 2025 — Present", bullets: ["Designed a ViT-based image encoder that disentangles a photo into illumination (extrinsic) and scene content (intrinsic), with a decoder that reconstructs accurate images from combined representations.", "Designed a DiT-based generative pipeline that takes lighting as a prompt and reference scene content as control, achieving high-quality vivid images."] },
    { id: "exp-tera", title: "Research Intern", subtitle: "Tera AI", location: "Remote", date: "Aug 2025 — Present", bullets: ["Achieved keyframe selection and periodic global optimization on Stream3R, substantially reducing streaming-inference memory use and increasing frame capacity.", "Designed visual odometry with a DINOv3 encoder to match correspondences across frames and reconstruct camera trajectories with a weighted eight-point algorithm.", "Collected and processed real-traffic imagery across varied times and weather conditions."] },
  ],
  projects: [
    { id: "project-sharp", title: "Privacy-Aware Sensor Data for Cooperative Perception", subtitle: "Supervised by Prof. Akarsh Prabhakara", location: "Madison, WI", date: "Jun 2025 — Jul 2025", bullets: ["Explored cooperative SLAM under privacy constraints using SHARP, transmitting pointmap-based novel-view renderings instead of raw images.", "Evaluated VGGT on the OPV2V dataset across ego-only, SHARP-generated, and raw multi-agent inputs.", "Extended the CARLA simulation in OPV2V with depth sensing for point-cloud rescaling and downstream 3D recovery."] },
    { id: "project-roma", title: "RoMA-SLAM: Robust SLAM Based on Dense Matching", subtitle: "Supervised by Prof. Mohit Gupta", location: "Madison, WI", date: "Feb 2025 — May 2025", bullets: ["Designed a RoMA-based SLAM pipeline inspired by MASt3R-SLAM, using dense matching and SVD-based pose estimation.", "Built a keyframe-driven backend with global pose-graph optimization for loop closures and inter-frame correspondences.", "Implemented post-optimization triangulation for accurate multi-view 3D reconstruction."] },
  ],
  publications: [
    { id: "pub-hotmobile", title: "Privacy-Aware Sharing of Raw Spatial Sensor Data for Cooperative Perception", subtitle: "Bangya Liu, Chenghao Jiang, Chengpo Yan, Suman Banerjee, Akarsh Prabhakara", location: "Under review", date: "HotMobile 2026", bullets: [] },
  ],
  skills: [
    { id: "skill-stack", title: "Programming & ML", subtitle: "Python · CUDA · PyTorch · LaTeX", location: "", date: "", bullets: [] },
    { id: "skill-research", title: "Research", subtitle: "3D reconstruction · SLAM · Gaussian Splatting · Diffusion Models · VLMs", location: "", date: "", bullets: [] },
  ],
};

const cloneInitial = () => JSON.parse(JSON.stringify(initialResume)) as ResumeData;
const makeId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export function ResumeBuilder({ initialTemplate = "Scholar", initialPageSize = "letter" }: { initialTemplate?: Template; initialPageSize?: PageSize }) {
  const [resume, setResume] = useState<ResumeData>(cloneInitial);
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);
  const [zoom, setZoom] = useState(90);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("已载入旧简历");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tommy-resume-studio-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.resume) setResume(parsed.resume);
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.pageSize) setPageSize(parsed.pageSize);
        setStatus("已恢复上次编辑");
      }
      const params = new URLSearchParams(window.location.search);
      const requestedTemplate = params.get("template");
      const requestedPage = params.get("page");
      if (["Scholar", "Modern", "Compact"].includes(requestedTemplate || "")) setTemplate(requestedTemplate as Template);
      if (["letter", "a4"].includes(requestedPage || "")) setPageSize(requestedPage as PageSize);
    } catch {
      setStatus("本地草稿无法读取");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("tommy-resume-studio-v1", JSON.stringify({ resume, template, pageSize }));
    const timer = window.setTimeout(() => setStatus("已自动保存"), 250);
    return () => window.clearTimeout(timer);
  }, [resume, template, pageSize, ready]);

  const updateProfile = (field: keyof ResumeData["profile"], value: string) => {
    setResume((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
    setStatus("保存中…");
  };

  const updateItem = (section: Exclude<SectionKey, "profile">, id: string, field: keyof ResumeItem, value: string | string[]) => {
    setResume((current) => ({ ...current, [section]: current[section].map((item) => item.id === id ? { ...item, [field]: value } : item) }));
    setStatus("保存中…");
  };

  const addItem = (section: Exclude<SectionKey, "profile">) => {
    const title: Record<typeof section, string> = { education: "New institution", experience: "New role", projects: "New project", publications: "New publication", skills: "New skill group" };
    setResume((current) => ({ ...current, [section]: [...current[section], { id: makeId(), title: title[section], subtitle: "", location: "", date: "", bullets: [] }] }));
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
    setStatus("数据已导出");
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
        setStatus("数据已导入");
      } catch {
        setStatus("导入失败：JSON 格式不正确");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const resetResume = () => {
    if (window.confirm("恢复为从旧简历导入的初始内容？当前修改会被覆盖。")) {
      setResume(cloneInitial());
      setTemplate("Scholar");
      setPageSize("letter");
      setStatus("已恢复初始内容");
    }
  };

  return (
    <main className="studio-shell">
      <header className="studio-header no-print">
        <div className="brand-mark">T</div>
        <div>
          <p className="eyebrow">PERSONAL WORKSPACE</p>
          <h1>Resume Studio</h1>
        </div>
        <div className="header-actions">
          <span className="saved-dot">{status}</span>
          <button className="text-button" onClick={resetResume}>恢复初始</button>
          <button className="secondary-button" onClick={() => fileInput.current?.click()}>导入 JSON</button>
          <button className="secondary-button" onClick={exportData}>导出 JSON</button>
          <button className="primary-button" onClick={() => window.print()}>导出 PDF</button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="application/json" onChange={importData} />
        </div>
      </header>

      <section className="studio-workspace">
        <aside className="editor-panel no-print">
          <div className="panel-heading">
            <div><p className="eyebrow">CONTENT</p><h2>编辑简历</h2></div>
            <span className="step-count">{String(tabs.indexOf(activeSection) + 1).padStart(2, "0")} / 06</span>
          </div>
          <nav className="section-tabs" aria-label="简历区块">
            {tabs.map((tab) => <button key={tab} className={activeSection === tab ? "active" : ""} onClick={() => setActiveSection(tab)}>{sectionLabels[tab]}</button>)}
          </nav>

          {activeSection === "profile" ? (
            <ProfileEditor profile={resume.profile} onChange={updateProfile} />
          ) : (
            <ItemsEditor
              section={activeSection}
              items={resume[activeSection]}
              onAdd={() => addItem(activeSection)}
              onRemove={(id) => removeItem(activeSection, id)}
              onMove={(index, direction) => moveItem(activeSection, index, direction)}
              onChange={(id, field, value) => updateItem(activeSection, id, field, value)}
            />
          )}
          <div className="privacy-note"><span>●</span><p><strong>仅保存在本机</strong><br />你的简历内容不会上传到服务器。</p></div>
        </aside>

        <section className="preview-panel">
          <div className="preview-toolbar no-print">
            <div><p className="eyebrow">LIVE PREVIEW</p><strong>{pageSize === "letter" ? "US Letter" : "A4"} · 实时排版</strong></div>
            <div className="toolbar-controls">
              <label className="select-control"><span>纸张</span><select value={pageSize} onChange={(event) => setPageSize(event.target.value as PageSize)}><option value="letter">Letter</option><option value="a4">A4</option></select></label>
              <label className="select-control zoom-control"><span>缩放</span><input type="range" min="60" max="110" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><b>{zoom}%</b></label>
            </div>
          </div>
          <div className="template-rail no-print" aria-label="PDF 模板">
            {(["Scholar", "Modern", "Compact"] as Template[]).map((item) => (
              <button key={item} className={template === item ? "active" : ""} onClick={() => setTemplate(item)}><span className={`template-swatch swatch-${item.toLowerCase()}`} /><span><strong>{item}</strong><small>{item === "Scholar" ? "学术经典" : item === "Modern" ? "现代研究" : "紧凑单页"}</small></span></button>
            ))}
          </div>

          <div className="paper-stage">
            <ResumePaper resume={resume} template={template} pageSize={pageSize} zoom={zoom} />
          </div>
          <p className="print-hint no-print">点击“导出 PDF”后，在系统窗口中选择“存储为 PDF”。模板与纸张设置会保留。</p>
        </section>
      </section>
    </main>
  );
}

function ProfileEditor({ profile, onChange }: { profile: ResumeData["profile"]; onChange: (field: keyof ResumeData["profile"], value: string) => void }) {
  const fields: Array<[keyof typeof profile, string, "input" | "textarea"]> = [
    ["name", "姓名", "input"], ["headline", "研究方向 / 职业标题", "input"], ["email", "邮箱", "input"], ["phone", "电话", "input"], ["location", "所在地", "input"], ["website", "个人主页", "input"], ["github", "GitHub", "input"], ["linkedin", "LinkedIn", "input"], ["updated", "更新日期", "input"], ["summary", "个人简介", "textarea"],
  ];
  return <div className="form-stack profile-grid">{fields.map(([field, label, type]) => <label key={field} className={field === "summary" || field === "headline" ? "field-wide" : ""}><span>{label}</span>{type === "textarea" ? <textarea rows={4} value={profile[field]} onChange={(event) => onChange(field, event.target.value)} /> : <input value={profile[field]} onChange={(event) => onChange(field, event.target.value)} />}</label>)}</div>;
}

function ItemsEditor({ section, items, onAdd, onRemove, onMove, onChange }: { section: Exclude<SectionKey, "profile">; items: ResumeItem[]; onAdd: () => void; onRemove: (id: string) => void; onMove: (index: number, direction: -1 | 1) => void; onChange: (id: string, field: keyof ResumeItem, value: string | string[]) => void }) {
  return <div className="items-editor">
    {items.map((item, index) => <article className="item-card" key={item.id}>
      <div className="item-card-heading"><span>{String(index + 1).padStart(2, "0")}</span><div><button aria-label="上移" disabled={index === 0} onClick={() => onMove(index, -1)}>↑</button><button aria-label="下移" disabled={index === items.length - 1} onClick={() => onMove(index, 1)}>↓</button><button className="danger" onClick={() => onRemove(item.id)}>删除</button></div></div>
      <div className="form-stack compact-form">
        <label className="field-wide"><span>{section === "publications" ? "论文标题" : section === "skills" ? "类别" : "标题"}</span><input value={item.title} onChange={(e) => onChange(item.id, "title", e.target.value)} /></label>
        <label className="field-wide"><span>{section === "publications" ? "作者" : section === "skills" ? "技能（使用 · 分隔）" : "机构 / 副标题"}</span><input value={item.subtitle} onChange={(e) => onChange(item.id, "subtitle", e.target.value)} /></label>
        <label><span>地点 / 状态</span><input value={item.location} onChange={(e) => onChange(item.id, "location", e.target.value)} /></label>
        <label><span>日期 / 会议信息</span><input value={item.date} onChange={(e) => onChange(item.id, "date", e.target.value)} /></label>
        {section !== "skills" && section !== "publications" && <label className="field-wide"><span>要点（每行一条）</span><textarea rows={5} value={item.bullets.join("\n")} onChange={(e) => onChange(item.id, "bullets", e.target.value.split("\n"))} /></label>}
      </div>
    </article>)}
    <button className="add-button" onClick={onAdd}>＋ 添加{sectionLabels[section]}</button>
  </div>;
}

function ResumePaper({ resume, template, pageSize, zoom }: { resume: ResumeData; template: Template; pageSize: PageSize; zoom: number }) {
  const p = resume.profile;
  return <article className={`resume-paper theme-${template.toLowerCase()} page-${pageSize}`} style={{ "--preview-scale": zoom / 100 } as React.CSSProperties}>
    <header className="resume-header">
      <p className="resume-kicker">CURRICULUM VITAE <span>UPDATED {p.updated.toUpperCase()}</span></p>
      <h2>{p.name}</h2>
      <p className="resume-headline">{p.headline}</p>
      <p className="resume-contact">{[p.location, p.email, p.phone, p.website, p.github, p.linkedin].filter(Boolean).join("  ·  ")}</p>
    </header>
    {p.summary && <p className="resume-summary">{p.summary}</p>}
    <ResumeSection title="Education"><ItemList items={resume.education} /></ResumeSection>
    <ResumeSection title="Experience"><ItemList items={resume.experience} /></ResumeSection>
    <ResumeSection title="Selected Projects"><ItemList items={resume.projects} /></ResumeSection>
    {resume.publications.length > 0 && <ResumeSection title="Publications"><ItemList items={resume.publications} publication /></ResumeSection>}
    {resume.skills.length > 0 && <ResumeSection title="Skills"><ItemList items={resume.skills} skills /></ResumeSection>}
    <footer className="resume-footer"><span>{p.name}</span><span>{p.website}</span></footer>
  </article>;
}

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="resume-section"><h3>{title}</h3>{children}</section>;
}

function ItemList({ items, publication = false, skills = false }: { items: ResumeItem[]; publication?: boolean; skills?: boolean }) {
  return <>{items.map((item) => <div className={`resume-entry ${publication ? "publication-entry" : ""} ${skills ? "skill-entry" : ""}`} key={item.id}>
    <div className="entry-heading"><strong>{item.title}</strong>{item.date && <span>{item.date}</span>}</div>
    <div className="entry-subheading"><em>{item.subtitle}</em>{item.location && <span>{item.location}</span>}</div>
    {item.bullets.filter(Boolean).length > 0 && <ul>{item.bullets.filter(Boolean).map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}
  </div>)}</>;
}
