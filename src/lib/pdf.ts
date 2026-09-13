import { jsPDF } from 'jspdf';
import type { CvConfig, Profile } from '../types';
import { formatRange } from './utils';

export function cvFilename(profile: Profile) {
  return (
    'Curriculum_' +
    (profile.personal.fullName.trim() || 'Mi_curriculum')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_') +
    '.pdf'
  );
}
export function buildCvPdf(profile: Profile, config: CvConfig): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: 'Currículum - ' + profile.personal.fullName,
    author: profile.personal.fullName,
  });
  const compact = config.template === 'compacto',
    margin = compact ? 17 : 21,
    width = 210 - margin * 2;
  const font =
    config.font === 'times' ? 'times' : config.font === 'georgia' ? 'times' : 'helvetica';
  const size = (compact ? 10 : 11) * config.fontScale;
  let y = margin;
  const accent = config.template === 'ats' ? '#172e27' : config.accent;
  const room = (height: number) => {
    if (y + height > 278) {
      doc.addPage();
      y = margin;
    }
  };
  const clean = (value: string) =>
    value.replace(/\t/g, '   ').replace(/\r/g, '').replace(/[•]/g, '-');
  const paragraph = (text: string, bold = false, custom = size, color = '#25352f') => {
    if (!text.trim()) return;
    doc.setFont(font, bold ? 'bold' : 'normal');
    doc.setFontSize(custom);
    doc.setTextColor(color);
    const lines: string[] = doc.splitTextToSize(clean(text), width);
    for (const l of lines) {
      room(custom * 0.5);
      doc.text(l, margin, y);
      y += custom * 0.49;
    }
    y += 1.5;
  };
  const section = (title: string) => {
    room(22);
    y += 5;
    paragraph(title.toUpperCase(), true, 10, accent);
    doc.setDrawColor(accent);
    doc.setLineWidth(0.25);
    doc.line(margin, y - 1, 210 - margin, y - 1);
    y += 3;
  };
  paragraph(profile.personal.fullName || 'Mi currículum', true, 23, accent);
  paragraph(profile.personal.headline, true, 13);
  paragraph([profile.personal.phone, profile.personal.email].filter(Boolean).join(' | '), false, 9);
  paragraph([profile.personal.city, profile.personal.country].filter(Boolean).join(', '), false, 9);
  paragraph(
    [profile.personal.linkedin, profile.personal.github, profile.personal.website]
      .filter(Boolean)
      .join(' | '),
    false,
    9,
  );
  if (config.showPhoto && profile.personal.photo.startsWith('data:image/')) {
    try {
      room(35);
      doc.addImage(profile.personal.photo, 'JPEG', margin, y, 25, 30);
      y += 35;
    } catch {
      /* Text remains exportable if a legacy photo is invalid. */
    }
  }
  if (config.showSummary && profile.personal.summary) {
    section('Perfil');
    paragraph(profile.personal.summary);
  }
  if (profile.experience.length) {
    section('Experiencia');
    for (const e of profile.experience) {
      room(24);
      paragraph(e.role || 'Experiencia', true);
      paragraph(
        [e.company, e.location, formatRange(e.startDate, e.endDate, e.current)]
          .filter(Boolean)
          .join(' · '),
        false,
        9,
      );
      for (const b of e.bullets.filter((b) => b.trim())) paragraph('- ' + b);
      if (e.tech.length) paragraph(e.tech.join(' · '), false, 9);
      y += 2;
    }
  }
  if (profile.education.length) {
    section('Educación');
    for (const e of profile.education) {
      room(20);
      paragraph(e.degree, true);
      paragraph(
        [e.institution, e.location, formatRange(e.startDate, e.endDate, e.current, 'En curso')]
          .filter(Boolean)
          .join(' · '),
        false,
        9,
      );
      paragraph(e.detail);
    }
  }
  if (profile.skills.some((g) => g.items.length)) {
    section('Habilidades');
    for (const g of profile.skills) {
      if (g.items.length) paragraph((g.name ? g.name + ': ' : '') + g.items.join(', '));
    }
  }
  if (config.showProjects && profile.projects.length) {
    section('Proyectos');
    for (const p of profile.projects) {
      room(20);
      paragraph(p.name, true);
      paragraph(p.description);
      paragraph([p.url, ...p.tech].filter(Boolean).join(' · '), false, 9);
    }
  }
  if (config.showCertifications && profile.certifications.length) {
    section('Cursos y certificaciones');
    for (const c of profile.certifications) {
      room(15);
      paragraph(c.name, true);
      paragraph([c.issuer, c.date, c.url].filter(Boolean).join(' · '), false, 9);
    }
  }
  if (config.showLanguages && profile.languages.length) {
    section('Idiomas');
    paragraph(profile.languages.map((l) => l.name + ': ' + l.level).join(' · '));
  }
  return doc.output('blob');
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
