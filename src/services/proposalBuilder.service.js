const path = require("path");
const fs = require("fs");
const { pool } = require("../config/database");
const { NotFoundError, ValidationError } = require("../utils/errors");

const uploadsRoot = path.join(process.cwd(), "uploads", "proposal");



function mapTemplateRow(row) {
  return {
    id: row.template_id,
    name: row.template_name,
    template_type: "html",
    layout_json: row.layout_json,
    html_output: row.html_template,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_active: row.is_active,
  };
}

async function listTemplates() {
  const { rows } = await pool.query(
    `SELECT template_id, template_name, layout_json, html_template, is_active, created_at, updated_at
     FROM proposal_templates
     WHERE is_active = true
     ORDER BY COALESCE(updated_at, created_at) DESC`,
  );
  return rows.map(mapTemplateRow);
}

async function getTemplateById(id) {
  const { rows } = await pool.query(
    `SELECT template_id, template_name, layout_json, html_template, is_active, created_at, updated_at
     FROM proposal_templates
     WHERE template_id = $1`,
    [id],
  );
  if (!rows.length) throw new NotFoundError("Template");
  return mapTemplateRow(rows[0]);
}

async function createTemplate({ name, template_type, layout_json, html_output }, userId) {
  const templateName = (name && String(name).trim()) || "Untitled Template";
  const layout = layout_json ?? [];
  const html = html_output != null ? String(html_output) : "";
  // template_type is accepted for compatibility but not stored in current schema
  void template_type;

  const { rows } = await pool.query(
    `INSERT INTO proposal_templates (template_name, layout_json, html_template, created_by)
     VALUES ($1, $2::jsonb, $3, $4)
     RETURNING template_id`,
    [templateName, JSON.stringify(layout), html, userId ?? null],
  );
  return rows[0].template_id;
}

async function updateTemplate(id, { name, template_type, layout_json, html_output }, userId) {
  void template_type;

  const layoutJsonValue =
    layout_json === undefined ? null : JSON.stringify(layout_json);
  const htmlValue = html_output === undefined ? null : String(html_output);
  const nameValue = name === undefined ? null : String(name).trim();

  const { rowCount } = await pool.query(
    `UPDATE proposal_templates
     SET template_name = COALESCE($2, template_name),
         layout_json   = COALESCE($3::jsonb, layout_json),
         html_template = COALESCE($4, html_template),
         updated_at    = now(),
         updated_by    = $5
     WHERE template_id = $1 AND is_active = true`,
    [id, nameValue, layoutJsonValue, htmlValue, userId ?? null],
  );
  if (!rowCount) throw new NotFoundError("Template");
}

async function deleteTemplate(id, userId) {
  const { rowCount } = await pool.query(
    `UPDATE proposal_templates
     SET is_active = false,
         updated_at = now(),
         updated_by = $2
     WHERE template_id = $1 AND is_active = true`,
    [id, userId ?? null],
  );
  if (!rowCount) throw new NotFoundError("Template");
}

async function duplicateTemplate(id, userId) {
  const { rows } = await pool.query(
    `SELECT template_name, layout_json, html_template
     FROM proposal_templates
     WHERE template_id = $1 AND is_active = true`,
    [id],
  );
  if (!rows.length) throw new NotFoundError("Template");
  const t = rows[0];
  const newName = `${t.template_name || "Template"} Copy`;
  const { rows: inserted } = await pool.query(
    `INSERT INTO proposal_templates (template_name, layout_json, html_template, created_by)
     VALUES ($1, $2::jsonb, $3, $4)
     RETURNING template_id`,
    [newName, JSON.stringify(t.layout_json ?? []), String(t.html_template ?? ""), userId ?? null],
  );
  return inserted[0].template_id;
}

async function assertTemplateExists(templateId) {
  if (!templateId) throw new ValidationError("templateId is required");
  const { rowCount } = await pool.query(
    `SELECT 1 FROM proposal_templates WHERE template_id = $1 AND is_active = true`,
    [templateId],
  );
  if (!rowCount) throw new NotFoundError("Template");
}

function getUploadsRoot() {
  return uploadsRoot;
}

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  assertTemplateExists,
  getUploadsRoot,
};

