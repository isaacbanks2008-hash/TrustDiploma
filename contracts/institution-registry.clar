;; TrustDiploma Institution Registry Contract
;; Clarity smart contract for registering and verifying educational institutions
;; Features: Admin controls, institution registration with verification, profile management, public key storage, query functions
;; Includes events for auditing, multi-admin support, pause functionality, and robust error handling

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-REGISTERED u102)
(define-constant ERR-INVALID-PROOF u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-INVALID-NAME u106)
(define-constant ERR-INVALID-URL u107)
(define-constant ERR-INVALID-PUBLIC-KEY u108)
(define-constant ERR-NOT-VERIFIED u109)
(define-constant ERR-ALREADY-VERIFIED u110)
(define-constant ERR-INVALID-ADMIN u111)

;; Constants for metadata limits
(define-constant MAX-NAME-LEN u100)
(define-constant MAX-URL-LEN u200)
(define-constant MAX-PUBLIC-KEY-LEN u66) ;; Typical secp256k1 public key length in hex

;; Data variables
(define-data-var contract-owner principal tx-sender)
(define-data-var paused bool false)

;; Maps
(define-map admins principal bool) ;; Map of authorized admins
(define-map institutions principal { 
  name: (string-ascii MAX-NAME-LEN),
  url: (string-ascii MAX-URL-LEN),
  public-key: (buff MAX-PUBLIC-KEY-LEN),
  verified: bool,
  registration-time: uint,
  verification-time: (optional uint)
})
(define-map pending-registrations principal { 
  name: (string-ascii MAX-NAME-LEN),
  url: (string-ascii MAX-URL-LEN),
  public-key: (buff MAX-PUBLIC-KEY-LEN),
  proof: (buff 1024) ;; Placeholder for proof data, e.g., signature or oracle data
})

;; Events (using print for logging in Clarity)
(define-private (log-event (event-name (string-ascii 32)) (data (string-ascii 256)))
  (print { event: event-name, data: data })
)

;; Private helper: is-owner
(define-private (is-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Private helper: is-admin (principal)
(define-private (is-admin (user principal))
  (default-to false (map-get? admins user))
)

;; Private helper: ensure-not-paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate-name
(define-private (validate-name (name (string-ascii MAX-NAME-LEN)))
  (and (> (len name) u0) (<= (len name) MAX-NAME-LEN))
)

;; Private helper: validate-url
(define-private (validate-url (url (string-ascii MAX-URL-LEN)))
  (and (> (len url) u0) (<= (len url) MAX-URL-LEN))
)

;; Private helper: validate-public-key
(define-private (validate-public-key (pk (buff MAX-PUBLIC-KEY-LEN)))
  (and (> (len pk) u0) (<= (len pk) MAX-PUBLIC-KEY-LEN))
)

;; Private helper: validate-proof (placeholder - in real impl, verify signature or oracle)
(define-private (validate-proof (proof (buff 1024)) (institution principal))
  ;; For demo, assume any non-empty proof is valid; in production, implement verification logic
  (> (len proof) u0)
)

;; Owner functions: transfer ownership
(define-public (transfer-ownership (new-owner principal))
  (begin
    (asserts! (is-owner) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-owner 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set contract-owner new-owner)
    (log-event "ownership-transferred" (to-string new-owner))
    (ok true)
  )
)

;; Owner/Admin functions: add admin
(define-public (add-admin (new-admin principal))
  (begin
    (asserts! (or (is-owner) (is-admin tx-sender)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (not (is-admin new-admin)) (err ERR-INVALID-ADMIN))
    (map-set admins new-admin true)
    (log-event "admin-added" (to-string new-admin))
    (ok true)
  )
)

;; Owner/Admin functions: remove admin
(define-public (remove-admin (target-admin principal))
  (begin
    (asserts! (or (is-owner) (is-admin tx-sender)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-admin target-admin) (err ERR-INVALID-ADMIN))
    (map-delete admins target-admin)
    (log-event "admin-removed" (to-string target-admin))
    (ok true)
  )
)

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (or (is-owner) (is-admin tx-sender)) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (log-event "paused-set" (if pause "true" "false"))
    (ok pause)
  )
)

;; Institution registration: submit for verification
(define-public (submit-registration (name (string-ascii MAX-NAME-LEN)) (url (string-ascii MAX-URL-LEN)) (public-key (buff MAX-PUBLIC-KEY-LEN)) (proof (buff 1024)))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-some (map-get? institutions tx-sender))) (err ERR-ALREADY-REGISTERED))
    (asserts! (not (is-some (map-get? pending-registrations tx-sender))) (err ERR-ALREADY-REGISTERED))
    (asserts! (validate-name name) (err ERR-INVALID-NAME))
    (asserts! (validate-url url) (err ERR-INVALID-URL))
    (asserts! (validate-public-key public-key) (err ERR-INVALID-PUBLIC-KEY))
    (map-set pending-registrations tx-sender { name: name, url: url, public-key: public-key, proof: proof })
    (log-event "registration-submitted" (to-string tx-sender))
    (ok true)
  )
)

;; Admin: verify and approve registration
(define-public (approve-registration (institution principal))
  (begin
    (asserts! (or (is-owner) (is-admin tx-sender)) (err ERR-NOT-AUTHORIZED))
    (ensure-not-paused)
    (match (map-get? pending-registrations institution)
      pending
      (begin
        (asserts! (validate-proof (get proof pending) institution) (err ERR-INVALID-PROOF))
        (map-set institutions institution {
          name: (get name pending),
          url: (get url pending),
          public-key: (get public-key pending),
          verified: true,
          registration-time: block-height,
          verification-time: (some block-height)
        })
        (map-delete pending-registrations institution)
        (log-event "registration-approved" (to-string institution))
        (ok true)
      )
      (err ERR-NOT-REGISTERED)
    )
  )
)

;; Admin: reject registration
(define-public (reject-registration (institution principal))
  (begin
    (asserts! (or (is-owner) (is-admin tx-sender)) (err ERR-NOT-AUTHORIZED))
    (ensure-not-paused)
    (asserts! (is-some (map-get? pending-registrations institution)) (err ERR-NOT-REGISTERED))
    (map-delete pending-registrations institution)
    (log-event "registration-rejected" (to-string institution))
    (ok true)
  )
)

;; Institution: update profile (only if verified)
(define-public (update-profile (new-name (string-ascii MAX-NAME-LEN)) (new-url (string-ascii MAX-URL-LEN)) (new-public-key (buff MAX-PUBLIC-KEY-LEN)))
  (begin
    (ensure-not-paused)
    (match (map-get? institutions tx-sender)
      profile
      (begin
        (asserts! (get verified profile) (err ERR-NOT-VERIFIED))
        (asserts! (validate-name new-name) (err ERR-INVALID-NAME))
        (asserts! (validate-url new-url) (err ERR-INVALID-URL))
        (asserts! (validate-public-key new-public-key) (err ERR-INVALID-PUBLIC-KEY))
        (map-set institutions tx-sender (merge profile {
          name: new-name,
          url: new-url,
          public-key: new-public-key
        }))
        (log-event "profile-updated" (to-string tx-sender))
        (ok true)
      )
      (err ERR-NOT-REGISTERED)
    )
  )
)

;; Admin: unverify institution
(define-public (unverify-institution (institution principal))
  (begin
    (asserts! (or (is-owner) (is-admin tx-sender)) (err ERR-NOT-AUTHORIZED))
    (ensure-not-paused)
    (match (map-get? institutions institution)
      profile
      (begin
        (asserts! (get verified profile) (err ERR-NOT-VERIFIED))
        (map-set institutions institution (merge profile { verified: false, verification-time: none }))
        (log-event "institution-unverified" (to-string institution))
        (ok true)
      )
      (err ERR-NOT-REGISTERED)
    )
  )
)

;; Read-only: get institution profile
(define-read-only (get-institution-profile (institution principal))
  (map-get? institutions institution)
)

;; Read-only: is institution verified
(define-read-only (is-institution-verified (institution principal))
  (match (map-get? institutions institution)
    profile (ok (get verified profile))
    (ok false)
  )
)

;; Read-only: get pending registration
(define-read-only (get-pending-registration (institution principal))
  (map-get? pending-registrations institution)
)

;; Read-only: get contract owner
(define-read-only (get-owner)
  (ok (var-get contract-owner))
)

;; Read-only: is paused
(define-read-only (get-paused)
  (ok (var-get paused))
)

;; Read-only: is admin
(define-read-only (get-is-admin (user principal))
  (ok (is-admin user))
)

;; Initialization: add initial admin (owner)
(begin
  (map-set admins (var-get contract-owner) true)
)