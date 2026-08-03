# Firebase web observability runbook

Pawtner uses consent-gated Firebase Analytics and Performance Monitoring for aggregate browser
observability. Supabase remains the source of truth for product and authenticated operational data.

## Console setup

1. In Firebase project `pawtner-app-2026`, enable Google Analytics and connect the existing
   `Pawtner Web` application to a GA4 web stream.
2. Copy the `G-...` measurement ID into `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` for the build.
3. Enable Performance Monitoring for the web application.
4. In GA Admin, set event-data retention to 14 months. Leave Google Signals, ad personalization,
   and advertising consent disabled.
5. Register the event-scoped custom dimensions `item_list_id`, `species`, `source_type`, `status`,
   `region_present`, `lead_type`, `metric_name`, `metric_rating`, and `page_path`.
6. Link Google Analytics to BigQuery with daily export in the approved project dataset location.
   Leave streaming export disabled for the initial rollout. Firebase Performance data for web is
   not eligible for direct BigQuery export; `web_vital` Analytics events provide the queryable web
   performance dataset.
7. Build with `NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED=true` only after the measurement ID and
   privacy controls have been verified in staging.

## Verification

- Fresh browser profile: no requests to `google-analytics.com`, `googletagmanager.com`,
  `firebaselogging.googleapis.com`, or `firebaseinstallations.googleapis.com` occur before consent.
- Choose **允許分析資料** and navigate between `/`, `/explore`, and a pet detail page. Confirm
  `page_view`, `view_item_list`, `select_item`, and `view_item` in GA DebugView.
- Confirm page paths contain no query string and dynamic paths appear as `/pets/[id]`.
- Keep a consented page open for at least ten seconds and confirm a request to
  `firebaselogging.googleapis.com`; Performance data can take several minutes to appear.
- Choose **變更分析資料設定** on `/legal/privacy`, select necessary-only, and confirm future
  Analytics and Performance requests stop.
- Analytics standard reports can take hours. Daily BigQuery tables normally appear after the next
  export cycle; allow up to 48 hours for the first link.

## Rollback

Set `NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED=false`, rebuild, and deploy. The application will
stop initializing both SDKs regardless of stored browser consent. Do not remove the measurement ID
or unlink BigQuery during an incident; preserving configuration makes rollback reversible.

## Saved BigQuery queries

Replace `PROJECT.DATASET.events_*` with the GA export table wildcard.

### Adoption funnel

```sql
select
  event_name,
  count(*) as events,
  count(distinct user_pseudo_id) as users
from `PROJECT.DATASET.events_*`
where _table_suffix between format_date('%Y%m%d', date_sub(current_date('Asia/Taipei'), interval 30 day))
  and format_date('%Y%m%d', current_date('Asia/Taipei'))
  and event_name in ('view_item_list', 'select_item', 'view_item', 'generate_lead', 'application_submit')
group by event_name
order by case event_name
  when 'view_item_list' then 1 when 'select_item' then 2 when 'view_item' then 3
  when 'generate_lead' then 4 else 5 end;
```

### Conversion by pet source and species

```sql
select
  (select value.string_value from unnest(event_params) where key = 'source_type') as source_type,
  (select value.string_value from unnest(event_params) where key = 'species') as species,
  countif(event_name = 'view_item') as detail_views,
  countif(event_name = 'generate_lead') as leads,
  safe_divide(countif(event_name = 'generate_lead'), countif(event_name = 'view_item')) as lead_rate
from `PROJECT.DATASET.events_*`
where _table_suffix between format_date('%Y%m%d', date_sub(current_date('Asia/Taipei'), interval 30 day))
  and format_date('%Y%m%d', current_date('Asia/Taipei'))
  and event_name in ('view_item', 'generate_lead')
group by source_type, species
order by detail_views desc;
```

### Core Web Vitals p75 by route

CLS values are multiplied by 1,000 before collection; divide the result by 1,000 when presenting it.

```sql
select
  (select value.string_value from unnest(event_params) where key = 'page_path') as page_path,
  (select value.string_value from unnest(event_params) where key = 'metric_name') as metric_name,
  approx_quantiles(
    (select value.int_value from unnest(event_params) where key = 'metric_value'), 100
  )[offset(75)] as p75_value,
  count(*) as samples
from `PROJECT.DATASET.events_*`
where _table_suffix between format_date('%Y%m%d', date_sub(current_date('Asia/Taipei'), interval 30 day))
  and format_date('%Y%m%d', current_date('Asia/Taipei'))
  and event_name = 'web_vital'
group by page_path, metric_name
order by page_path, metric_name;
```

Review p75 against LCP <= 2,500 ms, INP <= 200 ms, and CLS <= 0.1.
