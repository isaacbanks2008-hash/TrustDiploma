import { describe, it, expect, beforeEach } from "vitest";

interface InstitutionProfile {
  name: string;
  url: string;
  publicKey: string;
  verified: boolean;
  registrationTime: bigint;
  verificationTime?: bigint;
}

interface PendingRegistration {
  name: string;
  url: string;
  publicKey: string;
  proof: string;
}

const mockContract = {
  owner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  admins: new Map<string, boolean>(),
  institutions: new Map<string, InstitutionProfile>(),
  pendingRegistrations: new Map<string, PendingRegistration>(),
  MAX_NAME_LEN: 100,
  MAX_URL_LEN: 200,
  MAX_PUBLIC_KEY_LEN: 66,

  isOwner(caller: string): boolean {
    return caller === this.owner;
  },

  isAdmin(caller: string): boolean {
    return this.admins.get(caller) || false;
  },

  ensureNotPaused(): { error: number } | null {
    if (this.paused) return { error: 104 };
    return null;
  },

  validateName(name: string): boolean {
    return name.length > 0 && name.length <= this.MAX_NAME_LEN;
  },

  validateUrl(url: string): boolean {
    return url.length > 0 && url.length <= this.MAX_URL_LEN;
  },

  validatePublicKey(pk: string): boolean {
    return pk.length > 0 && pk.length <= this.MAX_PUBLIC_KEY_LEN;
  },

  validateProof(proof: string): boolean {
    return proof.length > 0;
  },

  transferOwnership(caller: string, newOwner: string): { value: boolean } | { error: number } {
    if (!this.isOwner(caller)) return { error: 100 };
    if (newOwner === "SP000000000000000000002Q6VF78") return { error: 105 };
    this.owner = newOwner;
    this.admins.set(newOwner, true);
    return { value: true };
  },

  addAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number } {
    if (!this.isOwner(caller) && !this.isAdmin(caller)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (this.isAdmin(newAdmin)) return { error: 111 };
    this.admins.set(newAdmin, true);
    return { value: true };
  },

  removeAdmin(caller: string, targetAdmin: string): { value: boolean } | { error: number } {
    if (!this.isOwner(caller) && !this.isAdmin(caller)) return { error: 100 };
    if (!this.isAdmin(targetAdmin)) return { error: 111 };
    this.admins.delete(targetAdmin);
    return { value: true };
  },

  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number } {
    if (!this.isOwner(caller) && !this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  submitRegistration(
    caller: string,
    name: string,
    url: string,
    publicKey: string,
    proof: string
  ): { value: boolean } | { error: number } {
    const paused = this.ensureNotPaused();
    if (paused) return paused;
    if (this.institutions.has(caller) || this.pendingRegistrations.has(caller)) return { error: 101 };
    if (!this.validateName(name)) return { error: 106 };
    if (!this.validateUrl(url)) return { error: 107 };
    if (!this.validatePublicKey(publicKey)) return { error: 108 };
    this.pendingRegistrations.set(caller, { name, url, publicKey, proof });
    return { value: true };
  },

  approveRegistration(caller: string, institution: string): { value: boolean } | { error: number } {
    if (!this.isOwner(caller) && !this.isAdmin(caller)) return { error: 100 };
    const paused = this.ensureNotPaused();
    if (paused) return paused;
    const pending = this.pendingRegistrations.get(institution);
    if (!pending) return { error: 102 };
    if (!this.validateProof(pending.proof)) return { error: 103 };
    this.institutions.set(institution, {
      name: pending.name,
      url: pending.url,
      publicKey: pending.publicKey,
      verified: true,
      registrationTime: BigInt(1000),
      verificationTime: BigInt(1000)
    });
    this.pendingRegistrations.delete(institution);
    return { value: true };
  },

  rejectRegistration(caller: string, institution: string): { value: boolean } | { error: number } {
    if (!this.isOwner(caller) && !this.isAdmin(caller)) return { error: 100 };
    const paused = this.ensureNotPaused();
    if (paused) return paused;
    if (!this.pendingRegistrations.has(institution)) return { error: 102 };
    this.pendingRegistrations.delete(institution);
    return { value: true };
  },

  updateProfile(
    caller: string,
    newName: string,
    newUrl: string,
    newPublicKey: string
  ): { value: boolean } | { error: number } {
    const paused = this.ensureNotPaused();
    if (paused) return paused;
    const profile = this.institutions.get(caller);
    if (!profile) return { error: 102 };
    if (!profile.verified) return { error: 109 };
    if (!this.validateName(newName)) return { error: 106 };
    if (!this.validateUrl(newUrl)) return { error: 107 };
    if (!this.validatePublicKey(newPublicKey)) return { error: 108 };
    this.institutions.set(caller, {
      ...profile,
      name: newName,
      url: newUrl,
      publicKey: newPublicKey
    });
    return { value: true };
  },

  unverifyInstitution(caller: string, institution: string): { value: boolean } | { error: number } {
    if (!this.isOwner(caller) && !this.isAdmin(caller)) return { error: 100 };
    const paused = this.ensureNotPaused();
    if (paused) return paused;
    const profile = this.institutions.get(institution);
    if (!profile) return { error: 102 };
    if (!profile.verified) return { error: 109 };
    this.institutions.set(institution, { ...profile, verified: false, verificationTime: undefined });
    return { value: true };
  },

  getInstitutionProfile(institution: string): InstitutionProfile | undefined {
    return this.institutions.get(institution);
  },

  isInstitutionVerified(institution: string): boolean {
    const profile = this.institutions.get(institution);
    return profile ? profile.verified : false;
  },

  getPendingRegistration(institution: string): PendingRegistration | undefined {
    return this.pendingRegistrations.get(institution);
  },

  getOwner(): string {
    return this.owner;
  },

  getPaused(): boolean {
    return this.paused;
  },

  getIsAdmin(user: string): boolean {
    return this.isAdmin(user);
  }
};

describe("TrustDiploma Institution Registry", () => {
  beforeEach(() => {
    mockContract.owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.admins = new Map([[mockContract.owner, true]]);
    mockContract.institutions = new Map();
    mockContract.pendingRegistrations = new Map();
  });

  it("should allow owner to transfer ownership", () => {
    const result = mockContract.transferOwnership(mockContract.owner, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.owner).toBe("ST2CY5...");
    expect(mockContract.getIsAdmin("ST2CY5...")).toBe(true);
  });

  it("should prevent non-owner from transferring ownership", () => {
    const result = mockContract.transferOwnership("ST2CY5...", "ST3NB...");
    expect(result).toEqual({ error: 100 });
  });

  it("should allow owner to add admin", () => {
    const result = mockContract.addAdmin(mockContract.owner, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.getIsAdmin("ST2CY5...")).toBe(true);
  });

  it("should prevent non-admin from adding admin", () => {
    const result = mockContract.addAdmin("ST2CY5...", "ST3NB...");
    expect(result).toEqual({ error: 100 });
  });

  it("should allow admin to remove admin", () => {
    mockContract.addAdmin(mockContract.owner, "ST2CY5...");
    const result = mockContract.removeAdmin(mockContract.owner, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.getIsAdmin("ST2CY5...")).toBe(false);
  });

  it("should allow admin to set paused state", () => {
    const result = mockContract.setPaused(mockContract.owner, true);
    expect(result).toEqual({ value: true });
    expect(mockContract.getPaused()).toBe(true);
  });

  it("should allow institution to submit registration", () => {
    const result = mockContract.submitRegistration(
      "ST2CY5...",
      "Test University",
      "https://test.edu",
      "0x1234",
      "proof-data"
    );
    expect(result).toEqual({ value: true });
    const pending = mockContract.getPendingRegistration("ST2CY5...");
    expect(pending).toEqual({
      name: "Test University",
      url: "https://test.edu",
      publicKey: "0x1234",
      proof: "proof-data"
    });
  });

  it("should prevent duplicate registration", () => {
    mockContract.submitRegistration("ST2CY5...", "Test University", "https://test.edu", "0x1234", "proof-data");
    const result = mockContract.submitRegistration(
      "ST2CY5...",
      "Another University",
      "https://another.edu",
      "0x5678",
      "proof-data"
    );
    expect(result).toEqual({ error: 101 });
  });

  it("should prevent registration with invalid name", () => {
    const longName = "A".repeat(101);
    const result = mockContract.submitRegistration("ST2CY5...", longName, "https://test.edu", "0x1234", "proof-data");
    expect(result).toEqual({ error: 106 });
  });

  it("should allow admin to approve registration", () => {
    mockContract.submitRegistration("ST2CY5...", "Test University", "https://test.edu", "0x1234", "proof-data");
    const result = mockContract.approveRegistration(mockContract.owner, "ST2CY5...");
    expect(result).toEqual({ value: true });
    const profile = mockContract.getInstitutionProfile("ST2CY5...");
    expect(profile).toEqual({
      name: "Test University",
      url: "https://test.edu",
      publicKey: "0x1234",
      verified: true,
      registrationTime: BigInt(1000),
      verificationTime: BigInt(1000)
    });
    expect(mockContract.isInstitutionVerified("ST2CY5...")).toBe(true);
  });

  it("should allow admin to reject registration", () => {
    mockContract.submitRegistration("ST2CY5...", "Test University", "https://test.edu", "0x1234", "proof-data");
    const result = mockContract.rejectRegistration(mockContract.owner, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.getPendingRegistration("ST2CY5...")).toBeUndefined();
  });

  it("should allow verified institution to update profile", () => {
    mockContract.submitRegistration("ST2CY5...", "Test University", "https://test.edu", "0x1234", "proof-data");
    mockContract.approveRegistration(mockContract.owner, "ST2CY5...");
    const result = mockContract.updateProfile("ST2CY5...", "New University", "https://new.edu", "0x5678");
    expect(result).toEqual({ value: true });
    const profile = mockContract.getInstitutionProfile("ST2CY5...");
    expect(profile).toEqual({
      name: "New University",
      url: "https://new.edu",
      publicKey: "0x5678",
      verified: true,
      registrationTime: BigInt(1000),
      verificationTime: BigInt(1000)
    });
  });

  it("should prevent unverified institution from updating profile", () => {
    mockContract.institutions.set("ST2CY5...", {
      name: "Test University",
      url: "https://test.edu",
      publicKey: "0x1234",
      verified: false,
      registrationTime: BigInt(1000)
    });
    const result = mockContract.updateProfile("ST2CY5...", "New University", "https://new.edu", "0x5678");
    expect(result).toEqual({ error: 109 });
  });

  it("should allow admin to unverify institution", () => {
    mockContract.submitRegistration("ST2CY5...", "Test University", "https://test.edu", "0x1234", "proof-data");
    mockContract.approveRegistration(mockContract.owner, "ST2CY5...");
    const result = mockContract.unverifyInstitution(mockContract.owner, "ST2CY5...");
    expect(result).toEqual({ value: true });
    expect(mockContract.isInstitutionVerified("ST2CY5...")).toBe(false);
  });

  it("should prevent operations when paused", () => {
    mockContract.setPaused(mockContract.owner, true);
    const result = mockContract.submitRegistration(
      "ST2CY5...",
      "Test University",
      "https://test.edu",
      "0x1234",
      "proof-data"
    );
    expect(result).toEqual({ error: 104 });
  });
});
