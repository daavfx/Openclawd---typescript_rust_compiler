import { html, nothing } from "lit";
export 
export 
function isFormDirty(state) {
  const {values, original} = state;
  return ((((((((values.name !== original.name) || (values.displayName !== original.displayName)) || (values.about !== original.about)) || (values.picture !== original.picture)) || (values.banner !== original.banner)) || (values.website !== original.website)) || (values.nip05 !== original.nip05)) || (values.lud16 !== original.lud16));
}
export function renderNostrProfileForm(params) {
  const {state, callbacks, accountId} = params;
  const isDirty = isFormDirty(state);
  const renderField = (field, label, opts = {  }) => {
    const {type = "text", placeholder, maxLength, help} = opts;
    const value = (state.values[field] ?? "");
    const error = state.fieldErrors[field];
    const inputId = "nostr-profile-";
    if ((type === "textarea")) {
      return html("
        <div class=\"form-field\" style=\"margin-bottom: 12px;\">
          <label for=\"\" style=\"display: block; margin-bottom: 4px; font-weight: 500;\">
            
          </label>
          <textarea
            id=\"\"
            .value=
            placeholder=
            maxlength=
            rows=\"3\"
            style=\"width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical; font-family: inherit;\"
            @input=
            ?disabled=
          ></textarea>
          
          
        </div>
      ");
    }
    return html("
      <div class=\"form-field\" style=\"margin-bottom: 12px;\">
        <label for=\"\" style=\"display: block; margin-bottom: 4px; font-weight: 500;\">
          
        </label>
        <input
          id=\"\"
          type=
          .value=
          placeholder=
          maxlength=
          style=\"width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;\"
          @input=
          ?disabled=
        />
        
        
      </div>
    ");
  };
  const renderPicturePreview = () => {
    const picture = state.values.picture;
    if (!picture) {
      return nothing;
    }
    return html("
      <div style=\"margin-bottom: 12px;\">
        <img
          src=
          alt=\"Profile picture preview\"
          style=\"max-width: 80px; max-height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);\"
          @error=
          @load=
        />
      </div>
    ");
  };
  return html("
    <div class=\"nostr-profile-form\" style=\"padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-top: 12px;\">
      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;\">
        <div style=\"font-weight: 600; font-size: 16px;\">Edit Profile</div>
        <div style=\"font-size: 12px; color: var(--text-muted);\">Account: </div>
      </div>

      

      

      

      

      

      

      

      

      <div style=\"display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;\">
        <button
          class=\"btn primary\"
          @click=
          ?disabled=
        >
          
        </button>

        <button
          class=\"btn\"
          @click=
          ?disabled=
        >
          
        </button>

        <button
          class=\"btn\"
          @click=
        >
          
        </button>

        <button
          class=\"btn\"
          @click=
          ?disabled=
        >
          Cancel
        </button>
      </div>

      
    </div>
  ");
}

export function createNostrProfileFormState(profile) {
  const values = { name: (profile?.name ?? ""), displayName: (profile?.displayName ?? ""), about: (profile?.about ?? ""), picture: (profile?.picture ?? ""), banner: (profile?.banner ?? ""), website: (profile?.website ?? ""), nip05: (profile?.nip05 ?? ""), lud16: (profile?.lud16 ?? "") };
  return { values, original: { ...values:  }, saving: false, importing: false, error: null, success: null, fieldErrors: {  }, showAdvanced: Boolean((((profile?.banner || profile?.website) || profile?.nip05) || profile?.lud16)) };
}

