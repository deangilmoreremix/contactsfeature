/*
  # Insert 10 Customer Closing Email Templates

  ## Overview
  Adds 10 professional email templates specifically designed for closing customers
  at various stages of the sales cycle, handling objections, and finalizing deals.

  ## Template Categories
  All templates are categorized as "Closing" and marked as default system templates.

  ## Templates Included
  1. Initial Proposal Follow-up - Check in after sending proposal
  2. Addressing Pricing Concerns - Handle budget objections professionally
  3. Competitive Differentiation - Respond to competitor mentions
  4. Decision Maker Buy-in - Help champion sell internally
  5. Urgency with Limited Time Offer - Create gentle urgency
  6. Social Proof and Case Study - Leverage similar customer success
  7. Trial or Pilot Program Offer - Reduce risk for hesitant prospects
  8. Final Contract Review - Pre-signature confirmation
  9. Overcoming Final Objections - Address last-minute concerns
  10. Closing Confirmation and Next Steps - Post-agreement onboarding

  ## Variables Used
  - Contact variables: first_name, last_name, full_name, company, title
  - Company variables: company_name, sender_name, sender_title, sender_phone, sender_email
  - Deal variables: deal_value, contract_term, start_date, discount_amount, discount_percent
  - Social proof: similar_client, roi_percentage, success_metric, case_study_link
  - Urgency: offer_expiry, limited_spots, seasonal_deadline, promotion_name
  - Product: product_name, solution_type, key_feature_1, key_feature_2, key_feature_3
  - Value: pain_point, benefit_1, benefit_2, value_proposition

  ## Security
  - All templates are marked as is_default = true (system templates)
  - RLS policies allow all authenticated users to read default templates
*/

-- Template 1: Initial Proposal Follow-up
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Initial Proposal Follow-up',
  'Professional follow-up after sending a proposal to check in and gauge interest',
  'Closing',
  'Following up on our proposal for {{company}}',
  'Hi {{first_name}},

I wanted to follow up on the proposal I sent over last week for {{solution_type}} at {{company}}.

I know you''re busy, and I''m sure you have questions. I''ve worked with companies similar to yours, and I understand that making this decision requires careful consideration.

Here''s what I''d like to do:

1. Address any questions you have about the proposal
2. Walk you through how {{product_name}} will help you {{benefit_1}}
3. Discuss the implementation timeline and what the first 90 days would look like

Are you available for a 15-minute call this week? I have slots open on {{meeting_day_1}} or {{meeting_day_2}}.

If the timing isn''t right, just let me know when would work better for you.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "company", "solution_type", "product_name", "benefit_1", "meeting_day_1", "meeting_day_2", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 2: Addressing Pricing Concerns
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Addressing Pricing Concerns',
  'Tactfully handle budget objections and demonstrate value over cost',
  'Closing',
  'Flexible options for {{company}} - Let''s find the right fit',
  'Hi {{first_name}},

Thank you for your candid feedback about the pricing. I really appreciate your transparency, and I want to work with you to find a solution that makes sense for {{company}}.

Let me share a different perspective on the investment:

**What This Really Costs You:**
The {{deal_value}} investment breaks down to just {{monthly_cost}} per month over {{contract_term}}. When you consider that this will help you {{benefit_1}} and {{benefit_2}}, most of our clients see ROI within {{roi_timeframe}}.

**Flexible Options:**
We can explore several approaches:
- Phased implementation starting with {{key_feature_1}}
- Extended payment terms over {{extended_term}}
- A pilot program focused on {{pilot_focus}} to prove value first

**The Real Cost:**
I want to be direct: the cost of not solving {{pain_point}} is likely higher than our solution. {{similar_client}} was facing the same challenge and calculated they were losing {{loss_amount}} annually before implementing our solution.

Would you be open to a brief call to explore which option might work best for your budget and timeline?

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "company", "deal_value", "monthly_cost", "contract_term", "benefit_1", "benefit_2", "roi_timeframe", "key_feature_1", "extended_term", "pilot_focus", "pain_point", "similar_client", "loss_amount", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 3: Competitive Differentiation
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Competitive Differentiation',
  'Respond professionally when prospects mention competitors, highlighting unique value',
  'Closing',
  'How {{product_name}} compares to {{competitor_name}}',
  'Hi {{first_name}},

Thanks for letting me know you''re also considering {{competitor_name}}. That''s a solid choice, and I respect that you''re doing your due diligence.

Let me be transparent about how we''re different:

**Where We Excel:**
✓ {{key_differentiator_1}}
✓ {{key_differentiator_2}}
✓ {{key_differentiator_3}}

**Why {{similar_client}} Chose Us:**
They were in your exact position last year, comparing us with {{competitor_name}}. What ultimately drove their decision was {{decision_factor}}. Since implementing {{product_name}}, they''ve achieved {{success_metric}}.

**What Our Clients Say:**
"{{testimonial_quote}}" - {{testimonial_name}}, {{testimonial_title}} at {{testimonial_company}}

**The Bottom Line:**
Both solutions will likely work for you. The question is which one will {{benefit_1}} while ensuring {{benefit_2}} specifically for companies like {{company}}.

I''ve prepared a side-by-side comparison document that''s objective and includes pricing. Would you like me to send it over?

I''m also happy to connect you directly with {{reference_client}} so you can hear their experience firsthand.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "product_name", "competitor_name", "key_differentiator_1", "key_differentiator_2", "key_differentiator_3", "similar_client", "decision_factor", "success_metric", "testimonial_quote", "testimonial_name", "testimonial_title", "testimonial_company", "benefit_1", "benefit_2", "company", "reference_client", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 4: Decision Maker Buy-in
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Decision Maker Buy-in',
  'Help your champion sell the solution internally to decision makers',
  'Closing',
  'Materials to help you present {{product_name}} to {{decision_maker_name}}',
  'Hi {{first_name}},

I know you''re excited about moving forward with {{product_name}}, and I want to help you get buy-in from {{decision_maker_name}} and the leadership team.

**I''ve Put Together an Internal Champion Kit:**

1. **Executive Summary** (1-page) - The business case in decision-maker language
2. **ROI Calculator** - Shows {{roi_percentage}}% ROI based on {{company}}''s specific numbers
3. **Risk Mitigation Plan** - Addresses the "what if this doesn''t work" concerns
4. **Implementation Timeline** - Clear 90-day roadmap with milestones
5. **Budget Justification** - How this pays for itself in {{payback_period}}

**I Can Also Help Directly:**

- Join your internal presentation (I''ll let you lead, just handle technical questions)
- Have a 1-on-1 call with {{decision_maker_name}} to address their concerns
- Provide references from companies in {{industry}} that {{decision_maker_name}} will recognize

**What Usually Closes the Deal:**

In my experience, the decision usually comes down to three questions:
1. "Will this actually solve {{pain_point}}?" (Answer: {{proof_point_1}})
2. "What''s the risk if it doesn''t work?" (Answer: {{risk_mitigation}})
3. "Why now instead of waiting?" (Answer: {{urgency_reason}})

I''ve attached the Champion Kit. Let me know if you need anything else to get this across the finish line. I''m here to support you.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "product_name", "decision_maker_name", "roi_percentage", "company", "payback_period", "industry", "pain_point", "proof_point_1", "risk_mitigation", "urgency_reason", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 5: Urgency with Limited Time Offer
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Urgency with Limited Time Offer',
  'Create gentle urgency without being pushy using time-limited incentives',
  'Closing',
  '{{promotion_name}} ends {{offer_expiry}} - Lock in your rate for {{company}}',
  'Hi {{first_name}},

I wanted to give you a heads up about something that could significantly impact your investment in {{product_name}}.

**Time-Sensitive Opportunity:**

Our {{promotion_name}} ends on {{offer_expiry}}, which means you can save {{discount_amount}} ({{discount_percent}}% off) if we finalize by then. That brings your investment down to {{discounted_price}} instead of the regular {{original_price}}.

**Why This Deadline Matters:**

- This pricing locks in for the entire {{contract_term}}
- {{limited_spots}} spots remaining at this rate (we''re at capacity for Q{{current_quarter}})
- Early {{start_month}} start means you''ll see results before {{milestone_date}}

**What Happens After {{offer_expiry}}:**

After this date:
- Standard pricing resumes at {{original_price}}
- Next available start date moves to {{next_start_date}}
- Implementation resources are allocated to Q{{next_quarter}} clients

**No Pressure, Just Transparency:**

I''re not trying to pressure you. This is simply our {{frequency}} capacity planning cycle, and I wanted you to have all the information to make the best decision for {{company}}.

If the timing isn''t right, I completely understand. But if you''ve been planning to move forward anyway, this could be great timing.

Want to hop on a quick call to discuss what moving forward would look like?

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "promotion_name", "offer_expiry", "company", "product_name", "discount_amount", "discount_percent", "discounted_price", "original_price", "contract_term", "limited_spots", "current_quarter", "start_month", "milestone_date", "next_start_date", "next_quarter", "frequency", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 6: Social Proof and Case Study
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Social Proof and Case Study',
  'Leverage similar customer success stories to build confidence and trust',
  'Closing',
  'How {{similar_client}} achieved {{success_metric}} with {{product_name}}',
  'Hi {{first_name}},

I thought you''d find this interesting - I just got off a call with {{similar_client}}, and they mentioned something that reminded me of your situation at {{company}}.

**Their Challenge (Sound Familiar?):**

{{similar_client}} was facing {{similar_challenge}} just like you''re dealing with {{pain_point}}. Their {{similar_role}} was skeptical about investing in a new solution, especially with {{similar_objection}}.

**What They Did:**

They started with {{pilot_scope}} as a pilot in {{pilot_timeframe}}. The results were compelling:
- {{metric_1}}: {{result_1}}
- {{metric_2}}: {{result_2}}
- {{metric_3}}: {{result_3}}

After seeing those results, they rolled out to their entire {{department}} and achieved {{success_metric}} within {{success_timeframe}}.

**The Full Story:**

I''ve attached a detailed case study with their complete journey, including:
- The specific challenges they faced
- How they measured success
- Exact ROI numbers ({{roi_percentage}}% return)
- What they''d do differently if starting over

**Want to Talk to Them Directly?**

{{reference_name}}, their {{reference_title}}, has agreed to take calls from prospects considering {{product_name}}. Would a 20-minute conversation with them be helpful?

I can also share case studies from {{industry_client_1}} and {{industry_client_2}} if you''d like to see more examples from your industry.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}

P.S. - {{similar_client}} started their pilot on {{pilot_start_date}} and were live across the company by {{full_rollout_date}}. The whole process was smoother than they expected.',
  '["first_name", "similar_client", "success_metric", "product_name", "company", "similar_challenge", "pain_point", "similar_role", "similar_objection", "pilot_scope", "pilot_timeframe", "metric_1", "result_1", "metric_2", "result_2", "metric_3", "result_3", "department", "success_timeframe", "roi_percentage", "reference_name", "reference_title", "industry_client_1", "industry_client_2", "pilot_start_date", "full_rollout_date", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 7: Trial or Pilot Program Offer
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Trial or Pilot Program Offer',
  'Reduce risk for hesitant prospects by offering a limited trial or pilot',
  'Closing',
  'Low-risk pilot program for {{company}} - Prove value before full commitment',
  'Hi {{first_name}},

I understand that committing to {{deal_value}} without seeing results first feels risky. Let me suggest a different approach that''s worked well for cautious decision-makers like yourself.

**{{pilot_program_name}} - Pilot Program:**

Instead of a full rollout, let''s start with a focused pilot:

**What''s Included:**
- {{pilot_duration}} pilot period
- Limited to {{pilot_scope}} ({{pilot_users}} users)
- Full access to {{key_feature_1}} and {{key_feature_2}}
- Dedicated implementation support
- Weekly check-ins to track {{success_metric}}

**Investment:**
- Pilot cost: {{pilot_price}} ({{percent_of_full}}% of full solution)
- If you proceed after pilot: Credit the full {{pilot_price}} toward your contract
- If you don''t see value: No obligation to continue

**Success Criteria (You Define):**

Let''s agree upfront on what success looks like:
1. {{success_criteria_1}}
2. {{success_criteria_2}}
3. {{success_criteria_3}}

If we hit those numbers, we move forward. If we don''t, you walk away. Fair?

**Timeline:**

- Week 1: {{week_1_milestone}}
- Week 2-{{pilot_duration_weeks}}: {{pilot_activity}}
- Final Week: Review results and decide on next steps

**Why This Works:**

{{similar_client}} did this exact pilot last {{pilot_reference_quarter}}. They were skeptical but hit {{pilot_result}} in just {{pilot_timeframe}}. They''ve been a full client for {{client_tenure}} now.

Want to discuss what a pilot might look like for {{company}}? I can have a detailed pilot plan to you by {{plan_delivery_date}}.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "company", "deal_value", "pilot_program_name", "pilot_duration", "pilot_scope", "pilot_users", "key_feature_1", "key_feature_2", "success_metric", "pilot_price", "percent_of_full", "success_criteria_1", "success_criteria_2", "success_criteria_3", "week_1_milestone", "pilot_duration_weeks", "pilot_activity", "similar_client", "pilot_reference_quarter", "pilot_result", "pilot_timeframe", "client_tenure", "plan_delivery_date", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 8: Final Contract Review
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Final Contract Review',
  'Pre-signature confirmation ensuring all details are correct and expectations are aligned',
  'Closing',
  'Final review before we get started - {{company}} + {{product_name}}',
  'Hi {{first_name}},

We''re almost there! Before you sign the contract, I want to make sure we''re 100% aligned on everything.

**Quick Contract Summary:**

📋 **What You''re Getting:**
- {{product_name}} - {{solution_description}}
- {{included_feature_1}}
- {{included_feature_2}}
- {{included_feature_3}}
- {{support_level}} support
- {{training_sessions}} training session(s)

💰 **Investment:**
- Total: {{deal_value}}
- Payment terms: {{payment_terms}}
- Contract length: {{contract_term}}
- Renewal terms: {{renewal_terms}}

📅 **Timeline:**
- Signature target: {{signature_date}}
- Kickoff call: {{kickoff_date}}
- Implementation: {{implementation_start}} to {{implementation_end}}
- Go-live date: {{golive_date}}

👥 **Key Contacts:**
- Implementation lead: {{implementation_contact}}
- Account manager: {{account_manager}}
- Technical support: {{support_contact}}

**Important Notes:**

1. {{important_note_1}}
2. {{important_note_2}}
3. {{important_note_3}}

**Before You Sign:**

Please review these key sections:
- Section {{section_number_1}}: {{section_description_1}}
- Section {{section_number_2}}: {{section_description_2}}
- Exhibit {{exhibit_letter}}: {{exhibit_description}}

**Any Last Questions?**

I want to make sure you feel completely confident before signing. Common questions at this stage:
- What exactly happens in the first 30 days?
- Who needs to be involved from our team?
- What if we need to make changes after we start?

I''ve blocked {{review_call_time}} on {{review_call_date}} for a final review call. Does that work for you?

Once you''re comfortable with everything, you can sign electronically at: {{signing_link}}

Looking forward to partnering with {{company}}!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}',
  '["first_name", "company", "product_name", "solution_description", "included_feature_1", "included_feature_2", "included_feature_3", "support_level", "training_sessions", "deal_value", "payment_terms", "contract_term", "renewal_terms", "signature_date", "kickoff_date", "implementation_start", "implementation_end", "golive_date", "implementation_contact", "account_manager", "support_contact", "important_note_1", "important_note_2", "important_note_3", "section_number_1", "section_description_1", "section_number_2", "section_description_2", "exhibit_letter", "exhibit_description", "review_call_time", "review_call_date", "signing_link", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 9: Overcoming Final Objections
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Overcoming Final Objections',
  'Address last-minute concerns and hesitations before closing the deal',
  'Closing',
  'Let''s address your concerns about {{objection_topic}}',
  'Hi {{first_name}},

Thank you for being upfront about {{objection_topic}}. I''d rather address this now than have you sign something you''re not comfortable with.

**Let me directly address your concern:**

{{objection_concern}}

**Here''s the reality:**

{{reality_statement}}

**How We''ve Handled This Before:**

{{similar_client}} had the exact same concern about {{similar_objection}}. Here''s what we did:

1. {{solution_step_1}}
2. {{solution_step_2}}
3. {{solution_step_3}}

The result? {{successful_outcome}}

**Specific to {{company}}:**

For your situation, we can:
- {{custom_solution_1}}
- {{custom_solution_2}}
- {{guarantee_or_safeguard}}

**What If I''m Wrong?**

Let''s be direct about worst-case scenarios:

If {{concern_scenario_1}}: {{mitigation_1}}
If {{concern_scenario_2}}: {{mitigation_2}}
If {{concern_scenario_3}}: {{mitigation_3}}

**The Decision Comes Down To:**

1. Do you believe {{product_name}} can help you {{benefit_1}}?
2. Do you trust that we''ll support you if issues arise?
3. Is the timing right for {{company}} to address {{pain_point}}?

If the answer to these is yes, then {{objection_topic}} is something we can work through together.

If the answer is no, then I respect that this isn''t the right fit right now.

**Next Step:**

Can we schedule 20 minutes to discuss this specific concern? I want you to feel completely confident before moving forward.

I''m available {{available_time_1}}, {{available_time_2}}, or {{available_time_3}}.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}
{{sender_phone}}

P.S. - {{testimonial_name}} from {{testimonial_company}} had similar concerns. Happy to connect you with them if you''d like to hear how it worked out.',
  '["first_name", "objection_topic", "objection_concern", "reality_statement", "similar_client", "similar_objection", "solution_step_1", "solution_step_2", "solution_step_3", "successful_outcome", "company", "custom_solution_1", "custom_solution_2", "guarantee_or_safeguard", "concern_scenario_1", "mitigation_1", "concern_scenario_2", "mitigation_2", "concern_scenario_3", "mitigation_3", "product_name", "benefit_1", "pain_point", "available_time_1", "available_time_2", "available_time_3", "testimonial_name", "testimonial_company", "sender_name", "sender_title", "company_name", "sender_phone"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Template 10: Closing Confirmation and Next Steps
INSERT INTO email_templates (name, description, category, subject, body, variables, is_default, is_ai_generated)
VALUES (
  'Closing Confirmation and Next Steps',
  'Post-signature confirmation with clear onboarding steps and expectations',
  'Closing',
  '🎉 Welcome to {{company_name}} - Your onboarding roadmap for {{company}}',
  'Hi {{first_name}},

Welcome to the {{company_name}} family! We''re excited to partner with {{company}} and help you {{primary_goal}}.

**What Happens Next:**

I know starting with a new solution can feel overwhelming, so I''ve mapped out exactly what to expect over the next {{onboarding_duration}}.

**📅 Your Onboarding Timeline:**

**Week 1: Foundation**
- {{week_1_day_1}}: Kickoff call with {{implementation_team}}
- {{week_1_day_3}}: {{onboarding_activity_1}}
- {{week_1_day_5}}: {{onboarding_activity_2}}

**Week 2-{{mid_point_week}}: Implementation**
- {{implementation_activity_1}}
- {{implementation_activity_2}}
- Training sessions: {{training_schedule}}

**Week {{mid_point_week}}-{{final_week}}: Launch Prep**
- {{launch_prep_1}}
- {{launch_prep_2}}
- Go-live: {{golive_date}}

**👥 Your Team:**

You''ll be working with:
- **{{implementation_lead}}** - Implementation Lead ({{implementation_email}})
- **{{account_manager}}** - Your Account Manager ({{account_email}})
- **{{technical_contact}}** - Technical Support ({{support_email}})

**📞 Our Kickoff Call:**

Scheduled for: {{kickoff_date}} at {{kickoff_time}}
Duration: {{kickoff_duration}}
Location: {{meeting_link}}

**Please bring:**
- {{attendee_role_1}} from your team
- {{attendee_role_2}} (if available)
- List of {{priority_items}} you want to tackle first

**📋 What We Need From You:**

Before our kickoff, please complete:
1. {{preparation_task_1}} - Due {{task_1_due}}
2. {{preparation_task_2}} - Due {{task_2_due}}
3. {{preparation_task_3}} - Due {{task_3_due}}

I''ve sent calendar invites and access to our {{resource_portal}} where you''ll find:
- Video tutorials
- Implementation checklist
- FAQ document
- Support contact information

**🎯 Success Metrics:**

Let''s track progress toward your goals:
- {{success_metric_1}}: Target {{target_1}}
- {{success_metric_2}}: Target {{target_2}}
- {{success_metric_3}}: Target {{target_3}}

We''ll review these in our {{review_frequency}} check-ins starting {{first_review_date}}.

**Questions?**

I know this is a lot of information. Don''t hesitate to reach out:
- Email me directly: {{sender_email}}
- Call/text: {{sender_phone}}
- Schedule time: {{calendar_link}}

We''re going to make this transition as smooth as possible. Looking forward to seeing {{company}} achieve {{primary_goal}}!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}

P.S. - Check your inbox for separate emails from {{implementation_lead}} with technical details and {{account_manager}} with your account dashboard access.',
  '["first_name", "company_name", "company", "primary_goal", "onboarding_duration", "week_1_day_1", "implementation_team", "week_1_day_3", "onboarding_activity_1", "week_1_day_5", "onboarding_activity_2", "mid_point_week", "implementation_activity_1", "implementation_activity_2", "training_schedule", "final_week", "launch_prep_1", "launch_prep_2", "golive_date", "implementation_lead", "implementation_email", "account_manager", "account_email", "technical_contact", "support_email", "kickoff_date", "kickoff_time", "kickoff_duration", "meeting_link", "attendee_role_1", "attendee_role_2", "priority_items", "preparation_task_1", "task_1_due", "preparation_task_2", "task_2_due", "preparation_task_3", "task_3_due", "resource_portal", "success_metric_1", "target_1", "success_metric_2", "target_2", "success_metric_3", "target_3", "review_frequency", "first_review_date", "sender_email", "sender_phone", "calendar_link", "sender_name", "sender_title"]'::jsonb,
  true,
  false
)
ON CONFLICT DO NOTHING;
