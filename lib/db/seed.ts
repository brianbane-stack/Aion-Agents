import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "@/lib/auth/password";
import { getDemoPassword } from "@/lib/auth/demo-password";
import { IDS } from "@/lib/demo/ids";
import { draftReviewReply } from "@/lib/ai/guard";
import { renderTemplate } from "@/lib/messages/policy";
import type { MemoryContext } from "@/types/domain";
import { workflowBlueprints } from "@/lib/workflows/blueprints";

function daysAgo(days: number, hour: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 15, 0, 0);
  return date.toISOString();
}

const horizonteMemory: MemoryContext = {
  formality: "acolhedor",
  emojiPolicy: "none",
  preferredPhrases: ["Obrigado por compartilhar sua experiência."],
  avoidedPhrases: ["infelizmente"],
  signOff: "Equipe da Clínica Horizonte Animal",
  explicitRules: ["Não invente procedimentos, diagnósticos ou informações sobre o animal."],
  approvedExamples: [],
};

export function seedDemonstration(db: DatabaseSync) {
  const now = new Date().toISOString();
  const password = hashPassword(getDemoPassword());
  const insert = (sql: string, params: Array<string | number | null>) => db.prepare(sql).run(...params);

  db.exec("BEGIN");
  try {
    insert("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)", [IDS.horizonteOrg, "Horizonte Animal", now]);
    insert("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)", [IDS.valeOrg, "Vale Felino", now]);

    insert(
      `INSERT INTO clinics (id, organization_id, name, phone, email, address, city, state, technical_manager, crmv, timezone, onboarding_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [IDS.horizonte, IDS.horizonteOrg, "Clínica Horizonte Animal", "(19) 3255-0140", "contato@horizonte.demo", "Rua das Acácias, 120", "Campinas", "SP", "Dra. Helena Prado", "CRMV-SP 45821", "America/Sao_Paulo", 1, now, now],
    );
    insert(
      `INSERT INTO clinics (id, organization_id, name, phone, email, address, city, state, technical_manager, crmv, timezone, onboarding_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [IDS.vale, IDS.valeOrg, "Clínica Vale Felino", "(19) 3888-2210", "contato@vale.demo", "Avenida dos Ipês, 45", "Valinhos", "SP", "Dra. Rita Campos", "CRMV-SP 39002", "America/Sao_Paulo", 0, now, now],
    );

    const users: Array<[string, string, string]> = [
      [IDS.helena, "helena@horizonte.demo", "Helena Prado"],
      [IDS.opera, "opera@horizonte.demo", "Camila Operação"],
      [IDS.leitura, "leitura@horizonte.demo", "Paulo Leitura"],
      [IDS.ricardo, "ricardo@vale.demo", "Ricardo Vale"],
    ];
    for (const [id, email, name] of users) {
      insert("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)", [id, email, name, password, now]);
    }

    const members: Array<[string, string, string, string]> = [
      [IDS.helena, IDS.horizonte, IDS.horizonteOrg, "owner"],
      [IDS.opera, IDS.horizonte, IDS.horizonteOrg, "operator"],
      [IDS.leitura, IDS.horizonte, IDS.horizonteOrg, "viewer"],
      [IDS.ricardo, IDS.vale, IDS.valeOrg, "owner"],
    ];
    for (const [userId, clinicId, orgId, role] of members) {
      insert(
        "INSERT INTO memberships (id, user_id, clinic_id, organization_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [`mem_${userId}`, userId, clinicId, orgId, role, now],
      );
    }

    for (const clinicId of [IDS.horizonte, IDS.vale]) {
      const memory = clinicId === IDS.horizonte ? horizonteMemory : { ...horizonteMemory, signOff: "Equipe da Clínica Vale Felino", preferredPhrases: ["Obrigado pelo retorno."], explicitRules: [] };
      insert(
        `INSERT INTO brand_preferences (clinic_id, formality, emoji_policy, preferred_phrases, avoided_phrases, sign_off, communication_rules, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [clinicId, memory.formality, memory.emojiPolicy, JSON.stringify(memory.preferredPhrases), JSON.stringify(memory.avoidedPhrases), memory.signOff, "Não inventar fatos clínicos. Não pedir avaliação em troca de benefício.", now],
      );
      insert(
        "INSERT INTO agents (id, clinic_id, key, display_name, status, updated_at) VALUES (?, ?, 'bruno', 'Dr. Bruno', 'active', ?)",
        [`agt_${clinicId}_bruno`, clinicId, now],
      );
      insert(
        "INSERT INTO agents (id, clinic_id, key, display_name, status, updated_at) VALUES (?, ?, 'lucas', 'Lucas', 'active', ?)",
        [`agt_${clinicId}_lucas`, clinicId, now],
      );
      for (const provider of ["google_business", "whatsapp_cloud"]) {
        insert(
          `INSERT INTO integrations (id, clinic_id, provider, status, scopes, public_config_json, updated_at)
           VALUES (?, ?, ?, 'not_configured', '', '{}', ?)`,
          [`int_${clinicId}_${provider}`, clinicId, provider, now],
        );
      }
    }

    const workflowIds: Record<string, string> = {
      "reply-reviews": IDS.replyWorkflow,
      "postvisit-followup": IDS.followWorkflow,
      "postvisit-review": IDS.reviewWorkflow,
    };
    for (const blueprint of workflowBlueprints()) {
      const workflowId = workflowIds[blueprint.key] ?? randomUUID();
      insert(
        `INSERT INTO workflows (id, clinic_id, agent_key, key, name, objective, autonomy, status, config_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [workflowId, IDS.horizonte, blueprint.agentKey, blueprint.key, blueprint.name, blueprint.objective, blueprint.autonomy, JSON.stringify(blueprint.config), now, now],
      );
      insert(
        `INSERT INTO message_templates (id, clinic_id, workflow_id, name, provider_template_name, language, body, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pt_BR', ?, ?)`,
        [`tmpl_${workflowId}`, IDS.horizonte, workflowId, blueprint.templateName, blueprint.providerTemplateName, blueprint.templateBody, now],
      );
      const valeWorkflow = `wf_v_${blueprint.key}`;
      insert(
        `INSERT INTO workflows (id, clinic_id, agent_key, key, name, objective, autonomy, status, config_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [valeWorkflow, IDS.vale, blueprint.agentKey, blueprint.key, blueprint.name, blueprint.objective, blueprint.autonomy, JSON.stringify(blueprint.config), now, now],
      );
      insert(
        `INSERT INTO message_templates (id, clinic_id, workflow_id, name, provider_template_name, language, body, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pt_BR', ?, ?)`,
        [`tmpl_${valeWorkflow}`, IDS.vale, valeWorkflow, blueprint.templateName, "", blueprint.templateBody, now],
      );
    }

    for (const entry of [
      ["mem_pref", "preferred_expression", "Agradecimento", horizonteMemory.preferredPhrases[0] ?? ""],
      ["mem_avoid", "avoided_expression", "Evitar", "infelizmente"],
      ["mem_rule", "explicit_rule", "Não inventar", horizonteMemory.explicitRules[0] ?? ""],
    ]) {
      insert(
        `INSERT INTO brand_memory_entries (id, clinic_id, kind, title, body, active, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 'user', ?, ?)`,
        [entry[0], IDS.horizonte, entry[1], entry[2], entry[3], now, now],
      );
    }

    const reviews: Array<[string, string, string, string, number, string, string, string]> = [
      [IDS.mariaReview, IDS.horizonte, "demo:h:maria", "Maria Souza", 5, "A Dra. Helena foi atenciosa com a Luna. A consulta foi clara e a recepção organizada.", daysAgo(6, 14), "unanswered"],
      [IDS.carlosReview, IDS.horizonte, "demo:h:carlos", "Carlos Mendes", 2, "Esperei quase duas horas com o Thor. Ninguém avisou o atraso.", daysAgo(4, 16), "suggestion_ready"],
      [IDS.anaReview, IDS.horizonte, "demo:h:ana", "Ana Lima", 4, "Atendimento bom, mas o estacionamento é difícil.", daysAgo(3, 11), "suggestion_ready"],
      [IDS.joaoReview, IDS.horizonte, "demo:h:joao", "João Ribeiro", 1, "Saí sem entender o que o meu gato tem. Quero uma explicação.", daysAgo(2, 18), "unanswered"],
      [IDS.beatrizReview, IDS.horizonte, "demo:h:beatriz", "Beatriz Nunes", 5, "", daysAgo(1, 13), "unanswered"],
      [IDS.pauloReview, IDS.horizonte, "demo:h:paulo", "Paulo Ferreira", 3, "O valor da vacina ficou acima do que eu esperava. O veterinário explicou as opções.", daysAgo(8, 15), "discarded"],
      [IDS.valeReview, IDS.vale, "demo:v:milo", "Lívia Martins", 5, "A consulta do Milo foi pontual e a equipe explicou o retorno.", daysAgo(2, 12), "unanswered"],
    ];
    for (const [id, clinicId, externalId, author, rating, comment, reviewedAt, state] of reviews) {
      insert(
        `INSERT INTO reviews (id, clinic_id, provider, external_id, provider_resource, author_name, rating, comment, reviewed_at, reply_state, source_mode, created_at, updated_at)
         VALUES (?, ?, 'google_business', ?, NULL, ?, ?, ?, ?, ?, 'demonstration', ?, ?)`,
        [id, clinicId, externalId, author, rating, comment, reviewedAt, state, now, now],
      );
    }

    const clinic = { name: "Clínica Horizonte Animal", phone: "(19) 3255-0140" };
    for (const reviewId of [IDS.carlosReview, IDS.anaReview, IDS.pauloReview]) {
      const review = reviews.find((item) => item[0] === reviewId);
      if (!review) continue;
      const draft = draftReviewReply({
        clinicName: clinic.name,
        phone: clinic.phone,
        authorName: review[3],
        rating: review[4],
        comment: review[5],
        memory: horizonteMemory,
      });
      insert(
        `INSERT INTO review_reply_suggestions (id, review_id, clinic_id, body, status, model_label, policy_notes, applied_memory, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bruno', ?)`,
        [`sug_${reviewId}`, reviewId, IDS.horizonte, draft.body, reviewId === IDS.pauloReview ? "rejected" : "draft", draft.modelLabel, JSON.stringify(draft.policyNotes), JSON.stringify(draft.applied), now],
      );
    }

    const contacts: Array<[string, string, string, string]> = [
      [IDS.rita, "Rita Alves", "+5519988776655", "opted_in"],
      [IDS.eduardo, "Eduardo Pires", "+5519977665544", "opted_out"],
      [IDS.camila, "Camila Rocha", "+5519966554433", "opted_in"],
      [IDS.lucia, "Lúcia Mendes", "+5519955443322", "unknown"],
    ];
    for (const [id, name, phone, consent] of contacts) {
      insert(
        `INSERT INTO contacts (id, clinic_id, display_name, phone_e164, consent_status, consent_source, source_mode, created_at)
         VALUES (?, ?, ?, ?, ?, 'ficha de demonstração', 'demonstration', ?)`,
        [id, IDS.horizonte, name, phone, consent, now],
      );
    }

    const followTemplate = workflowBlueprints().find((item) => item.key === "postvisit-followup")?.templateBody ?? "";
    insert(
      `INSERT INTO workflow_runs (id, clinic_id, workflow_id, contact_id, status, scheduled_for, idempotency_key, reason, created_at, updated_at)
       VALUES ('run_rita', ?, ?, ?, 'prepared', ?, ?, 'Elegível: consentimento registrado e sem envio anterior.', ?, ?)`,
      [IDS.horizonte, IDS.followWorkflow, IDS.rita, daysAgo(0, 9), `${IDS.horizonte}:${IDS.followWorkflow}:${IDS.rita}`, now, now],
    );
    insert(
      `INSERT INTO outbound_messages (id, clinic_id, workflow_run_id, contact_id, template_id, body_rendered, state, idempotency_key, attempt_count, source_mode, created_at, updated_at)
       VALUES (?, ?, 'run_rita', ?, ?, ?, 'awaiting_approval', ?, 0, 'demonstration', ?, ?)`,
      [IDS.ritaMessage, IDS.horizonte, IDS.rita, `tmpl_${IDS.followWorkflow}`, renderTemplate(followTemplate, "Rita"), `${IDS.horizonte}:${IDS.followWorkflow}:${IDS.rita}:message`, now, now],
    );
    insert(
      `INSERT INTO workflow_runs (id, clinic_id, workflow_id, contact_id, status, idempotency_key, reason, created_at, updated_at)
       VALUES ('run_eduardo', ?, ?, ?, 'skipped', ?, 'Consentimento recusado. Nenhum envio foi criado na Meta.', ?, ?)`,
      [IDS.horizonte, IDS.followWorkflow, IDS.eduardo, `${IDS.horizonte}:${IDS.followWorkflow}:${IDS.eduardo}`, now, now],
    );
    insert(
      `INSERT INTO outbound_messages (id, clinic_id, workflow_run_id, contact_id, template_id, body_rendered, state, idempotency_key, attempt_count, last_error, source_mode, created_at, updated_at)
       VALUES (?, ?, 'run_eduardo', ?, ?, ?, 'blocked_consent', ?, 0, 'Contato recusou mensagens.', 'demonstration', ?, ?)`,
      [IDS.eduardoMessage, IDS.horizonte, IDS.eduardo, `tmpl_${IDS.followWorkflow}`, renderTemplate(followTemplate, "Eduardo"), `${IDS.horizonte}:${IDS.followWorkflow}:${IDS.eduardo}:message`, now, now],
    );

    const events: Array<[string, string, string, string, string, string, string, string | null, string | null]> = [
      ["act_carlos", "action_required", "bruno", "bruno", "Dr. Bruno", "Sugestão pronta para Carlos Mendes", "A avaliação de 2 de 5 tem um rascunho local. Nada foi publicado no Google.", "review", IDS.carlosReview],
      ["act_rita", "info", "lucas", "lucas", "Lucas", "Acompanhamento preparado para Rita Alves", "A mensagem está aguardando aprovação. Nenhuma chamada foi feita à Meta.", "message", IDS.ritaMessage],
      ["act_eduardo", "info", "lucas", "lucas", "Lucas", "Envio não criado para Eduardo Pires", "O consentimento está recusado. O fluxo registrou o bloqueio e não tentou enviar.", "message", IDS.eduardoMessage],
    ];
    for (const [id, kind, actorType, actorKey, actorLabel, title, detail, subjectType, subjectId] of events) {
      insert(
        `INSERT INTO activity_events (id, clinic_id, kind, actor_type, actor_key, actor_label, title, detail, subject_type, subject_id, result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registrado localmente. Sem efeito externo.', ?)`,
        [id, IDS.horizonte, kind, actorType, actorKey, actorLabel, title, detail, subjectType, subjectId, now],
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
