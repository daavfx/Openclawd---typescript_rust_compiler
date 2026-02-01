import { html, nothing } from "lit";
import { defaultValue, hintForPath, humanize, isSensitivePath, pathKey, schemaType } from "./config-form.shared";
const META_KEYS = new Set(["title", "description", "default", "nullable"]);
function isAnySchema(schema) {
  const keys = Object.keys((schema ?? {  })).filter((key) => !META_KEYS.has(key));
  return (keys.length === 0);
}
function jsonValue(value) {
  if ((value === undefined)) {
    return "";
  }
  try {
    {
      return (JSON.stringify(value, null, 2) ?? "");
    }
  }
  catch {
    {
      return "";
    }
  }
}
const icons = { chevronDown: html("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>"), plus: html("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line></svg>"), minus: html("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line></svg>"), trash: html("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path></svg>"), edit: html("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"></path><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"></path></svg>") };
export function renderNode(params) {
  const {schema, value, path, hints, unsupported, disabled, onPatch} = params;
  const showLabel = (params.showLabel ?? true);
  const type = schemaType(schema);
  const hint = hintForPath(path, hints);
  const label = ((hint?.label ?? schema.title) ?? humanize(String(path.at(-1))));
  const help = (hint?.help ?? schema.description);
  const key = pathKey(path);
  if (unsupported.has(key)) {
    return html("<div class=\"cfg-field cfg-field--error\">
      <div class=\"cfg-field__label\"></div>
      <div class=\"cfg-field__error\">Unsupported schema node. Use Raw mode.</div>
    </div>");
  }
  if ((schema.anyOf || schema.oneOf)) {
    const variants = ((schema.anyOf ?? schema.oneOf) ?? []);
    const nonNull = variants.filter((v) => !((v.type === "null") || (Array.isArray(v.type) && v.type.includes("null"))));
    if ((nonNull.length === 1)) {
      return renderNode({ ...params: , schema: nonNull[0] });
    }
    const extractLiteral = (v) => {
      if ((v.const !== undefined)) {
        return v.const;
      }
      if ((v.enum && (v.enum.length === 1))) {
        return v.enum[0];
      }
      return undefined;
    };
    const literals = nonNull.map(extractLiteral);
    const allLiterals = literals.every((v) => (v !== undefined));
    if (((allLiterals && (literals.length > 0)) && (literals.length <= 5))) {
      const resolvedValue = (value ?? schema.default);
      return html("
        <div class=\"cfg-field\">
          
          
          <div class=\"cfg-segmented\">
            
          </div>
        </div>
      ");
    }
    if ((allLiterals && (literals.length > 5))) {
      return renderSelect({ ...params: , options: literals, value: (value ?? schema.default) });
    }
    const primitiveTypes = new Set(nonNull.map((variant) => schemaType(variant)).filter(Boolean));
    const normalizedTypes = new Set([...primitiveTypes].map((v) => (v === "integer") ? "number" : v));
    if ([...normalizedTypes].every((v) => ["string", "number", "boolean"].includes(v))) {
      const hasString = normalizedTypes.has("string");
      const hasNumber = normalizedTypes.has("number");
      const hasBoolean = normalizedTypes.has("boolean");
      if ((hasBoolean && (normalizedTypes.size === 1))) {
        return renderNode({ ...params: , schema: { ...schema: , type: "boolean", anyOf: undefined, oneOf: undefined } });
      }
      if ((hasString || hasNumber)) {
        return renderTextInput({ ...params: , inputType: (hasNumber && !hasString) ? "number" : "text" });
      }
    }
  }
  if (schema.enum) {
    const options = schema.enum;
    if ((options.length <= 5)) {
      const resolvedValue = (value ?? schema.default);
      return html("
        <div class=\"cfg-field\">
          
          
          <div class=\"cfg-segmented\">
            
          </div>
        </div>
      ");
    }
    return renderSelect({ ...params: , options, value: (value ?? schema.default) });
  }
  if ((type === "object")) {
    return renderObject(params);
  }
  if ((type === "array")) {
    return renderArray(params);
  }
  if ((type === "boolean")) {
    const displayValue = (typeof value === "boolean") ? value : (typeof schema.default === "boolean") ? schema.default : false;
    return html("
      <label class=\"cfg-toggle-row \">
        <div class=\"cfg-toggle-row__content\">
          <span class=\"cfg-toggle-row__label\"></span>
          
        </div>
        <div class=\"cfg-toggle\">
          <input
            type=\"checkbox\"
            .checked=
            ?disabled=
            @change=
          />
          <span class=\"cfg-toggle__track\"></span>
        </div>
      </label>
    ");
  }
  if (((type === "number") || (type === "integer"))) {
    return renderNumberInput(params);
  }
  if ((type === "string")) {
    return renderTextInput({ ...params: , inputType: "text" });
  }
  return html("
    <div class=\"cfg-field cfg-field--error\">
      <div class=\"cfg-field__label\"></div>
      <div class=\"cfg-field__error\">Unsupported type: . Use Raw mode.</div>
    </div>
  ");
}

function renderTextInput(params) {
  const {schema, value, path, hints, disabled, onPatch, inputType} = params;
  const showLabel = (params.showLabel ?? true);
  const hint = hintForPath(path, hints);
  const label = ((hint?.label ?? schema.title) ?? humanize(String(path.at(-1))));
  const help = (hint?.help ?? schema.description);
  const isSensitive = (hint?.sensitive ?? isSensitivePath(path));
  const placeholder = (hint?.placeholder ?? isSensitive ? "••••" : (schema.default !== undefined) ? "Default: " : "");
  const displayValue = (value ?? "");
  return html("
    <div class=\"cfg-field\">
      
      
      <div class=\"cfg-input-wrap\">
        <input
          type=
          class=\"cfg-input\"
          placeholder=
          .value=
          ?disabled=
          @input=
          @change=
        />
        
      </div>
    </div>
  ");
}
function renderNumberInput(params) {
  const {schema, value, path, hints, disabled, onPatch} = params;
  const showLabel = (params.showLabel ?? true);
  const hint = hintForPath(path, hints);
  const label = ((hint?.label ?? schema.title) ?? humanize(String(path.at(-1))));
  const help = (hint?.help ?? schema.description);
  const displayValue = ((value ?? schema.default) ?? "");
  const numValue = (typeof displayValue === "number") ? displayValue : 0;
  return html("
    <div class=\"cfg-field\">
      
      
      <div class=\"cfg-number\">
        <button
          type=\"button\"
          class=\"cfg-number__btn\"
          ?disabled=
          @click=
        >−</button>
        <input
          type=\"number\"
          class=\"cfg-number__input\"
          .value=
          ?disabled=
          @input=
        />
        <button
          type=\"button\"
          class=\"cfg-number__btn\"
          ?disabled=
          @click=
        >+</button>
      </div>
    </div>
  ");
}
function renderSelect(params) {
  const {schema, value, path, hints, disabled, options, onPatch} = params;
  const showLabel = (params.showLabel ?? true);
  const hint = hintForPath(path, hints);
  const label = ((hint?.label ?? schema.title) ?? humanize(String(path.at(-1))));
  const help = (hint?.help ?? schema.description);
  const resolvedValue = (value ?? schema.default);
  const currentIndex = options.findIndex((opt) => ((opt === resolvedValue) || (String(opt) === String(resolvedValue))));
  const unset = "__unset__";
  return html("
    <div class=\"cfg-field\">
      
      
      <select
        class=\"cfg-select\"
        ?disabled=
        .value=
        @change=
      >
        <option value=>Select...</option>
        
      </select>
    </div>
  ");
}
function renderObject(params) {
  const {schema, value, path, hints, unsupported, disabled, onPatch} = params;
  const showLabel = (params.showLabel ?? true);
  const hint = hintForPath(path, hints);
  const label = ((hint?.label ?? schema.title) ?? humanize(String(path.at(-1))));
  const help = (hint?.help ?? schema.description);
  const fallback = (value ?? schema.default);
  const obj = ((fallback && (typeof fallback === "object")) && !Array.isArray(fallback)) ? fallback : {  };
  const props = (schema.properties ?? {  });
  const entries = Object.entries(props);
  const sorted = entries.sort((a, b) => {
    const orderA = (hintForPath([...path, a[0]], hints)?.order ?? 0);
    const orderB = (hintForPath([...path, b[0]], hints)?.order ?? 0);
    if ((orderA !== orderB)) {
      return (orderA - orderB);
    }
    return a[0].localeCompare(b[0]);
  });
  const reserved = new Set(Object.keys(props));
  const additional = schema.additionalProperties;
  const allowExtra = (Boolean(additional) && (typeof additional === "object"));
  if ((path.length === 1)) {
    return html("
      <div class=\"cfg-fields\">
        
        
      </div>
    ");
  }
  return html("
    <details class=\"cfg-object\" open>
      <summary class=\"cfg-object__header\">
        <span class=\"cfg-object__title\"></span>
        <span class=\"cfg-object__chevron\"></span>
      </summary>
      
      <div class=\"cfg-object__content\">
        
        
      </div>
    </details>
  ");
}
function renderArray(params) {
  const {schema, value, path, hints, unsupported, disabled, onPatch} = params;
  const showLabel = (params.showLabel ?? true);
  const hint = hintForPath(path, hints);
  const label = ((hint?.label ?? schema.title) ?? humanize(String(path.at(-1))));
  const help = (hint?.help ?? schema.description);
  const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
  if (!itemsSchema) {
    return html("
      <div class=\"cfg-field cfg-field--error\">
        <div class=\"cfg-field__label\"></div>
        <div class=\"cfg-field__error\">Unsupported array schema. Use Raw mode.</div>
      </div>
    ");
  }
  const arr = Array.isArray(value) ? value : Array.isArray(schema.default) ? schema.default : [];
  return html("
    <div class=\"cfg-array\">
      <div class=\"cfg-array__header\">
        
        <span class=\"cfg-array__count\"> item</span>
        <button
          type=\"button\"
          class=\"cfg-array__add\"
          ?disabled=
          @click=
        >
          <span class=\"cfg-array__add-icon\"></span>
          Add
        </button>
      </div>
      

      
    </div>
  ");
}
function renderMapField(params) {
  const {schema, value, path, hints, unsupported, disabled, reservedKeys, onPatch} = params;
  const anySchema = isAnySchema(schema);
  const entries = Object.entries((value ?? {  })).filter(([key]) => !reservedKeys.has(key));
  return html("
    <div class=\"cfg-map\">
      <div class=\"cfg-map__header\">
        <span class=\"cfg-map__label\">Custom entries</span>
        <button
          type=\"button\"
          class=\"cfg-map__add\"
          ?disabled=
          @click=
        >
          <span class=\"cfg-map__add-icon\"></span>
          Add Entry
        </button>
      </div>

      
    </div>
  ");
}
