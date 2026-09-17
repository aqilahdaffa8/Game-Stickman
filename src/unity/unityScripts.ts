export interface UnityFile {
  path: string;
  name: string;
  category: string;
  description: string;
  code: string;
}

export const UNITY_PROJECT_FILES: UnityFile[] = [
  {
    path: 'Assets/Scripts/Combat/IDamageable.cs',
    name: 'IDamageable.cs',
    category: 'Combat',
    description: 'Interface for any entity (Player, Enemy, Breakable) that can receive damage and knockback.',
    code: `using UnityEngine;

namespace StickmanBattle.Combat
{
    public interface IDamageable
    {
        int CurrentHealth { get; }
        int MaxHealth { get; }
        bool IsDead { get; }

        void TakeDamage(DamageInfo damageInfo);
    }

    [System.Serializable]
    public struct DamageInfo
    {
        public int damageAmount;
        public Vector2 hitPoint;
        public Vector2 hitDirection;
        public float knockbackForce;
        public GameObject damageDealer;
        public bool isCritical;

        public DamageInfo(int damage, Vector2 point, Vector2 direction, float knockback, GameObject dealer = null, bool crit = false)
        {
            damageAmount = damage;
            hitPoint = point;
            hitDirection = direction.normalized;
            knockbackForce = knockback;
            damageDealer = dealer;
            isCritical = crit;
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Weapons/WeaponData.cs',
    name: 'WeaponData.cs',
    category: 'Weapons',
    description: 'ScriptableObject data definition for modular weapons (Melee, Ranged, Special).',
    code: `using UnityEngine;

namespace StickmanBattle.Weapons
{
    public enum WeaponType
    {
        Melee,
        Ranged,
        Special
    }

    [CreateAssetMenu(fileName = "NewWeaponData", menuName = "Stickman Battle/Weapon Data")]
    public class WeaponData : ScriptableObject
    {
        [Header("Identity")]
        public string weaponName = "New Weapon";
        public WeaponType weaponType = WeaponType.Ranged;
        public Sprite weaponSprite;
        public Sprite weaponIcon;

        [Header("Combat Stats")]
        [Tooltip("Damage dealt per strike or per bullet pellet")]
        public int damage = 20;

        [Tooltip("Attacks/Shots per second")]
        public float fireRate = 3.0f;

        [Tooltip("Effective range in Unity units")]
        public float range = 15.0f;

        [Tooltip("Impulse force applied on target impact")]
        public float knockback = 12.0f;

        [Header("Ammo & Reloading")]
        [Tooltip("Set to 0 or -1 for infinite melee")]
        public int magazineSize = 12;
        public float reloadTime = 1.5f;

        [Header("Ranged Specific")]
        public GameObject projectilePrefab;
        public float projectileSpeed = 22.0f;
        public float spreadAngle = 2.0f;
        public int pelletsCount = 1;
        public GameObject muzzleFlashPrefab;

        [Header("Audio Clips")]
        public AudioClip attackAudio;
        public AudioClip reloadAudio;
        public AudioClip emptyAudio;
    }
}`,
  },
  {
    path: 'Assets/Scripts/Weapons/Projectile.cs',
    name: 'Projectile.cs',
    category: 'Weapons',
    description: '2D bullet projectile with layer mask filtering, trail renderer, and damage application.',
    code: `using UnityEngine;
using StickmanBattle.Combat;

namespace StickmanBattle.Weapons
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Collider2D))]
    public class Projectile : MonoBehaviour
    {
        [SerializeField] private float lifetime = 3.0f;
        [SerializeField] private GameObject hitEffectPrefab;
        [SerializeField] private TrailRenderer trailRenderer;

        private int damage;
        private float knockback;
        private GameObject owner;
        private LayerMask targetLayer;
        private Rigidbody2D rb;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        public void Initialize(int dmg, float kb, float speed, Vector2 direction, GameObject shooter, LayerMask targets)
        {
            damage = dmg;
            knockback = kb;
            owner = shooter;
            targetLayer = targets;

            rb.linearVelocity = direction.normalized * speed;
            transform.right = direction;

            Destroy(gameObject, lifetime);
        }

        private void OnTriggerEnter2D(Collider2D collision)
        {
            // Ignore owner
            if (collision.gameObject == owner) return;

            // Check if collision is in target layer
            if ((targetLayer.value & (1 << collision.gameObject.layer)) != 0)
            {
                if (collision.TryGetComponent<IDamageable>(out var damageable))
                {
                    Vector2 hitDirection = rb.linearVelocity.normalized;
                    DamageInfo info = new DamageInfo(damage, transform.position, hitDirection, knockback, owner);
                    damageable.TakeDamage(info);
                }

                SpawnHitEffect();
                Destroy(gameObject);
            }
            // Environment collision
            else if (collision.gameObject.layer == LayerMask.NameToLayer("Environment"))
            {
                SpawnHitEffect();
                Destroy(gameObject);
            }
        }

        private void SpawnHitEffect()
        {
            if (hitEffectPrefab != null)
            {
                Instantiate(hitEffectPrefab, transform.position, Quaternion.identity);
            }
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Weapons/GrenadeProjectile.cs',
    name: 'GrenadeProjectile.cs',
    category: 'Weapons',
    description: 'Bouncing physics grenade with timed fuse, radial damage, and screen shake impulse.',
    code: `using UnityEngine;
using StickmanBattle.Combat;
using StickmanBattle.CameraSystem;

namespace StickmanBattle.Weapons
{
    [RequireComponent(typeof(Rigidbody2D), typeof(CircleCollider2D))]
    public class GrenadeProjectile : MonoBehaviour
    {
        [SerializeField] private float fuseTime = 2.5f;
        [SerializeField] private float blastRadius = 4.5f;
        [SerializeField] private GameObject explosionVFX;
        [SerializeField] private AudioClip beepAudio;
        [SerializeField] private AudioClip explosionAudio;

        private int blastDamage;
        private float blastKnockback;
        private GameObject owner;
        private LayerMask damageLayers;
        private float timer;

        public void Initialize(int damage, float knockback, Vector2 throwVelocity, GameObject thrower, LayerMask targets)
        {
            blastDamage = damage;
            blastKnockback = knockback;
            owner = thrower;
            damageLayers = targets;

            GetComponent<Rigidbody2D>().linearVelocity = throwVelocity;
            timer = fuseTime;
        }

        private void Update()
        {
            timer -= Time.deltaTime;
            if (timer <= 0f)
            {
                Explode();
            }
        }

        private void Explode()
        {
            // Screen shake
            if (CameraFollow2D.Instance != null)
            {
                CameraFollow2D.Instance.Shake(0.6f);
            }

            // Radial damage query
            Collider2D[] hits = Physics2D.OverlapCircleAll(transform.position, blastRadius, damageLayers);
            foreach (var col in hits)
            {
                if (col.TryGetComponent<IDamageable>(out var damageable))
                {
                    Vector2 dir = (col.transform.position - transform.position).normalized;
                    float dist = Vector2.Distance(transform.position, col.transform.position);
                    float falloff = Mathf.Clamp01(1f - (dist / blastRadius));
                    int dealt = Mathf.RoundToInt(blastDamage * (0.5f + falloff * 0.5f));

                    DamageInfo info = new DamageInfo(dealt, col.transform.position, dir, blastKnockback * falloff, owner);
                    damageable.TakeDamage(info);
                }
            }

            if (explosionVFX != null)
            {
                Instantiate(explosionVFX, transform.position, Quaternion.identity);
            }

            Destroy(gameObject);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, blastRadius);
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Player/PlayerMovement.cs',
    name: 'PlayerMovement.cs',
    category: 'Player',
    description: 'Responsive physics-based 2D movement, variable jump height, double jump, and platform drop-through.',
    code: `using UnityEngine;

namespace StickmanBattle.Player
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Collider2D))]
    public class PlayerMovement : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 9.0f;
        [SerializeField] private float acceleration = 60.0f;
        [SerializeField] private float groundDeceleration = 40.0f;

        [Header("Jumping")]
        [SerializeField] private float jumpForce = 16.0f;
        [SerializeField] private float doubleJumpForce = 14.0f;
        [SerializeField] private Transform groundCheck;
        [SerializeField] private float groundCheckRadius = 0.25f;
        [SerializeField] private LayerMask groundLayer;

        private Rigidbody2D rb;
        private float horizontalInput;
        private bool isGrounded;
        private bool canDoubleJump;
        private bool dropDownRequested;

        public bool IsGrounded => isGrounded;
        public float HorizontalVelocity => rb.linearVelocity.x;
        public Vector2 Velocity => rb.linearVelocity;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        public void SetMoveInput(float xInput, bool dropDown)
        {
            horizontalInput = xInput;
            dropDownRequested = dropDown;
        }

        public void Jump()
        {
            if (isGrounded)
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
                canDoubleJump = true;
            }
            else if (canDoubleJump)
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, doubleJumpForce);
                canDoubleJump = false;
            }
        }

        private void FixedUpdate()
        {
            CheckGround();
            ApplyHorizontalMovement();
        }

        private void CheckGround()
        {
            isGrounded = Physics2D.OverlapCircle(groundCheck.position, groundCheckRadius, groundLayer);
            if (isGrounded && rb.linearVelocity.y <= 0.1f)
            {
                canDoubleJump = true;
            }
        }

        private void ApplyHorizontalMovement()
        {
            float targetSpeed = horizontalInput * moveSpeed;
            float accel = Mathf.Abs(horizontalInput) > 0.01f ? acceleration : groundDeceleration;
            float newX = Mathf.MoveTowards(rb.linearVelocity.x, targetSpeed, accel * Time.fixedDeltaTime);
            rb.linearVelocity = new Vector2(newX, rb.linearVelocity.y);
        }

        public void ApplyKnockback(Vector2 impulse)
        {
            rb.AddForce(impulse, ForceMode2D.Impulse);
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Player/PlayerCombat.cs',
    name: 'PlayerCombat.cs',
    category: 'Player',
    description: 'Handles aiming arm towards cursor, firing ranged weapons, and swinging melee weapons.',
    code: `using UnityEngine;
using StickmanBattle.Weapons;
using StickmanBattle.Combat;

namespace StickmanBattle.Player
{
    public class PlayerCombat : MonoBehaviour
    {
        [Header("Aiming & Bones")]
        [SerializeField] private Transform aimArmTransform;
        [SerializeField] private Transform weaponHoldPoint;
        [SerializeField] private Transform firePoint;
        [SerializeField] private LayerMask enemyLayers;

        [Header("References")]
        [SerializeField] private PlayerWeaponController weaponController;

        private Vector2 aimDirection;
        private float lastAttackTime;

        private void Update()
        {
            UpdateAim();
        }

        private void UpdateAim()
        {
            Vector3 mousePos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            mousePos.z = 0;
            aimDirection = (mousePos - aimArmTransform.position).normalized;

            float angle = Mathf.Atan2(aimDirection.y, aimDirection.x) * Mathf.Rad2Deg;
            aimArmTransform.rotation = Quaternion.Euler(0, 0, angle);

            // Flip character model if aiming left
            bool aimingRight = aimDirection.x >= 0;
            transform.localScale = new Vector3(aimingRight ? 1 : -1, 1, 1);
        }

        public void TryAttack()
        {
            WeaponData currentWeapon = weaponController.CurrentWeapon;
            if (currentWeapon == null) return;

            float attackInterval = 1f / currentWeapon.fireRate;
            if (Time.time - lastAttackTime < attackInterval) return;

            if (currentWeapon.weaponType == WeaponType.Melee)
            {
                ExecuteMeleeAttack(currentWeapon);
            }
            else
            {
                ExecuteRangedAttack(currentWeapon);
            }

            lastAttackTime = Time.time;
        }

        private void ExecuteMeleeAttack(WeaponData weapon)
        {
            Collider2D[] hits = Physics2D.OverlapCircleAll(firePoint.position, weapon.range, enemyLayers);
            foreach (var col in hits)
            {
                if (col.TryGetComponent<IDamageable>(out var target))
                {
                    DamageInfo info = new DamageInfo(weapon.damage, col.transform.position, aimDirection, weapon.knockback, gameObject);
                    target.TakeDamage(info);
                }
            }
        }

        private void ExecuteRangedAttack(WeaponData weapon)
        {
            if (!weaponController.ConsumeAmmo()) return;

            for (int i = 0; i < weapon.pelletsCount; i++)
            {
                float spread = Random.Range(-weapon.spreadAngle, weapon.spreadAngle);
                Vector2 dir = Quaternion.Euler(0, 0, spread) * aimDirection;

                GameObject projObj = Instantiate(weapon.projectilePrefab, firePoint.position, Quaternion.identity);
                if (projObj.TryGetComponent<Projectile>(out var proj))
                {
                    proj.Initialize(weapon.damage, weapon.knockback, weapon.projectileSpeed, dir, gameObject, enemyLayers);
                }
            }
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Player/PlayerHealth.cs',
    name: 'PlayerHealth.cs',
    category: 'Player',
    description: 'Implements IDamageable on player, broadcasts health events, handles invulnerability frames and death.',
    code: `using UnityEngine;
using System;
using StickmanBattle.Combat;
using StickmanBattle.CameraSystem;

namespace StickmanBattle.Player
{
    public class PlayerHealth : MonoBehaviour, IDamageable
    {
        [SerializeField] private int maxHealth = 150;
        [SerializeField] private float invulnerabilityDuration = 0.5f;

        public event Action<int, int> OnHealthChanged;
        public event Action OnDeath;

        private int currentHealth;
        private bool isDead;
        private float invulnerableTimer;
        private PlayerMovement movement;

        public int CurrentHealth => currentHealth;
        public int MaxHealth => maxHealth;
        public bool IsDead => isDead;

        private void Awake()
        {
            movement = GetComponent<PlayerMovement>();
            currentHealth = maxHealth;
        }

        private void Update()
        {
            if (invulnerableTimer > 0f)
            {
                invulnerableTimer -= Time.deltaTime;
            }
        }

        public void TakeDamage(DamageInfo damageInfo)
        {
            if (isDead || invulnerableTimer > 0f) return;

            currentHealth = Mathf.Max(0, currentHealth - damageInfo.damageAmount);
            invulnerableTimer = invulnerabilityDuration;

            OnHealthChanged?.Invoke(currentHealth, maxHealth);

            // Knockback impulse
            if (movement != null)
            {
                movement.ApplyKnockback(damageInfo.hitDirection * damageInfo.knockbackForce);
            }

            // Screen shake
            if (CameraFollow2D.Instance != null)
            {
                CameraFollow2D.Instance.Shake(0.3f);
            }

            if (currentHealth <= 0)
            {
                Die();
            }
        }

        private void Die()
        {
            isDead = true;
            OnDeath?.Invoke();
            // Trigger ragdoll or death animation
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Enemy/EnemyAI.cs',
    name: 'EnemyAI.cs',
    category: 'Enemy',
    description: 'Hierarchical State Machine (Idle, Patrol, Chase, Attack, Hurt, Dead) for modular stickman enemies.',
    code: `using UnityEngine;
using StickmanBattle.Combat;
using StickmanBattle.Weapons;

namespace StickmanBattle.Enemy
{
    public enum EnemyState
    {
        Idle,
        Patrol,
        Chase,
        Attack,
        Hurt,
        Dead
    }

    [RequireComponent(typeof(Rigidbody2D))]
    public class EnemyAI : MonoBehaviour
    {
        [Header("Stats")]
        [SerializeField] private float moveSpeed = 5.0f;
        [SerializeField] private float detectionRadius = 12.0f;
        [SerializeField] private float attackRange = 2.0f;
        [SerializeField] private WeaponData startingWeapon;

        [Header("Layers & References")]
        [SerializeField] private LayerMask playerLayer;
        [SerializeField] private Transform firePoint;
        [SerializeField] private Transform aimArm;

        private EnemyState currentState = EnemyState.Idle;
        private Transform playerTarget;
        private Rigidbody2D rb;
        private float stateTimer;
        private int patrolDirection = 1;
        private float lastAttackTime;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        private void Start()
        {
            GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
            if (playerObj != null) playerTarget = playerObj.transform;
            SwitchState(EnemyState.Idle);
        }

        private void Update()
        {
            if (currentState == EnemyState.Dead) return;

            UpdateStateMachine();
        }

        private void UpdateStateMachine()
        {
            float distToPlayer = playerTarget != null ? Vector2.Distance(transform.position, playerTarget.position) : 999f;

            switch (currentState)
            {
                case EnemyState.Idle:
                    rb.linearVelocity = new Vector2(0, rb.linearVelocity.y);
                    if (distToPlayer < detectionRadius)
                    {
                        SwitchState(EnemyState.Chase);
                    }
                    else if (stateTimer <= 0f)
                    {
                        patrolDirection = Random.value > 0.5f ? 1 : -1;
                        SwitchState(EnemyState.Patrol);
                    }
                    break;

                case EnemyState.Patrol:
                    rb.linearVelocity = new Vector2(patrolDirection * (moveSpeed * 0.5f), rb.linearVelocity.y);
                    transform.localScale = new Vector3(patrolDirection, 1, 1);
                    if (distToPlayer < detectionRadius)
                    {
                        SwitchState(EnemyState.Chase);
                    }
                    else if (stateTimer <= 0f)
                    {
                        SwitchState(EnemyState.Idle);
                    }
                    break;

                case EnemyState.Chase:
                    if (playerTarget == null || distToPlayer > detectionRadius * 1.5f)
                    {
                        SwitchState(EnemyState.Idle);
                        break;
                    }

                    float dirX = Mathf.Sign(playerTarget.position.x - transform.position.x);
                    rb.linearVelocity = new Vector2(dirX * moveSpeed, rb.linearVelocity.y);
                    transform.localScale = new Vector3(dirX, 1, 1);

                    // Aim at player
                    AimAtTarget(playerTarget.position);

                    if (distToPlayer <= attackRange)
                    {
                        SwitchState(EnemyState.Attack);
                    }
                    break;

                case EnemyState.Attack:
                    rb.linearVelocity = new Vector2(0, rb.linearVelocity.y);
                    AimAtTarget(playerTarget.position);

                    if (Time.time - lastAttackTime >= 1f / startingWeapon.fireRate)
                    {
                        ExecuteAttack();
                        lastAttackTime = Time.time;
                    }

                    if (distToPlayer > attackRange * 1.25f)
                    {
                        SwitchState(EnemyState.Chase);
                    }
                    break;
            }

            stateTimer -= Time.deltaTime;
        }

        private void AimAtTarget(Vector3 targetPos)
        {
            Vector2 dir = (targetPos - aimArm.position).normalized;
            float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
            aimArm.rotation = Quaternion.Euler(0, 0, angle);
        }

        private void ExecuteAttack()
        {
            // Trigger projectile or melee hit
            if (startingWeapon.weaponType == WeaponType.Melee)
            {
                Collider2D hit = Physics2D.OverlapCircle(firePoint.position, startingWeapon.range, playerLayer);
                if (hit != null && hit.TryGetComponent<IDamageable>(out var target))
                {
                    Vector2 dir = (hit.transform.position - transform.position).normalized;
                    target.TakeDamage(new DamageInfo(startingWeapon.damage, hit.transform.position, dir, startingWeapon.knockback, gameObject));
                }
            }
        }

        public void SwitchState(EnemyState newState)
        {
            currentState = newState;
            stateTimer = Random.Range(1.5f, 3.0f);
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Camera/CameraFollow2D.cs',
    name: 'CameraFollow2D.cs',
    category: 'Camera',
    description: 'Smooth 2D camera following with arena bounds clamping and trauma-based decay screen shake.',
    code: `using UnityEngine;

namespace StickmanBattle.CameraSystem
{
    public class CameraFollow2D : MonoBehaviour
    {
        public static CameraFollow2D Instance { get; private set; }

        [Header("Target & Damping")]
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0, 1.5f, -10f);
        [SerializeField] private float smoothTime = 0.2f;

        [Header("Arena Bounds")]
        [SerializeField] private Vector2 minBounds = new Vector2(-20f, -5f);
        [SerializeField] private Vector2 maxBounds = new Vector2(20f, 15f);

        private Vector3 currentVelocity;
        private float trauma;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void Shake(float amount)
        {
            trauma = Mathf.Clamp01(trauma + amount);
        }

        private void LateUpdate()
        {
            if (target == null) return;

            Vector3 desiredPosition = target.position + offset;
            Vector3 smoothed = Vector3.SmoothDamp(transform.position, desiredPosition, ref currentVelocity, smoothTime);

            // Clamp inside arena bounds
            smoothed.x = Mathf.Clamp(smoothed.x, minBounds.x, maxBounds.x);
            smoothed.y = Mathf.Clamp(smoothed.y, minBounds.y, maxBounds.y);

            // Apply trauma shake
            if (trauma > 0f)
            {
                float shakeMagnitude = trauma * trauma * 0.6f;
                Vector3 shakeOffset = new Vector3(
                    (Random.value * 2f - 1f) * shakeMagnitude,
                    (Random.value * 2f - 1f) * shakeMagnitude,
                    0
                );
                smoothed += shakeOffset;
                trauma = Mathf.MoveTowards(trauma, 0f, Time.deltaTime * 2.0f);
            }

            transform.position = smoothed;
        }
    }
}`,
  },
  {
    path: 'Assets/Scripts/Core/GameManager.cs',
    name: 'GameManager.cs',
    category: 'Core',
    description: 'Master Game Manager orchestrating Waves, Kill Counters, Score, and Victory/GameOver states.',
    code: `using UnityEngine;
using System;

namespace StickmanBattle.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game State")]
        public int currentWave = 1;
        public int score = 0;
        public int killCount = 0;
        public float matchTimer = 0f;

        public event Action<int> OnScoreChanged;
        public event Action<int> OnWaveChanged;
        public event Action OnGameOver;
        public event Action OnVictory;

        private bool isGameActive = false;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void StartGame()
        {
            currentWave = 1;
            score = 0;
            killCount = 0;
            matchTimer = 0f;
            isGameActive = true;
            OnWaveChanged?.Invoke(currentWave);
        }

        public void RegisterKill(int points)
        {
            killCount++;
            score += points;
            OnScoreChanged?.Invoke(score);
        }

        private void Update()
        {
            if (isGameActive)
            {
                matchTimer += Time.deltaTime;
            }
        }
    }
}`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'Setup Guide',
    description: 'Complete Unity setup checklist, Layer Collision Matrix, and Input System guide.',
    code: `# STICKMAN BATTLE 2D — UNITY SETUP & INTEGRATION GUIDE

### 1. Unity Version & Packages
- Recommended: **Unity 2022.3 LTS or Unity 6**
- Required Packages:
  * **Input System** (com.unity.inputsystem)
  * **2D Animation & 2D Physics**

### 2. Layer & Collision Matrix
Go to \`Project Settings > Physics 2D\`:
Create the following Layers:
- \`Player\` (Layer 8)
- \`Enemy\` (Layer 9)
- \`ProjectilePlayer\` (Layer 10)
- \`ProjectileEnemy\` (Layer 11)
- \`Environment\` (Layer 12)
- \`WeaponDrop\` (Layer 13)

Uncheck:
- ProjectilePlayer vs Player
- ProjectilePlayer vs ProjectilePlayer
- ProjectileEnemy vs Enemy
- ProjectileEnemy vs ProjectileEnemy
- WeaponDrop vs Projectiles

### 3. ScriptableObject Weapon Creation
Right-click in Project view:
\`Create > Stickman Battle > Weapon Data\`
Set up:
- Fist (Melee, 15 Damage, 2.8 FireRate)
- Sword (Melee, 42 Damage, 1.6 FireRate)
- Bat (Melee, 65 Damage, 1.1 FireRate)
- Pistol (Ranged, 24 Damage, 12 Ammo)
- Shotgun (Ranged, 16 Dmg x 6 Pellets, 6 Ammo)
- Rifle (Ranged, 19 Damage, 30 Ammo)
- Grenade (Special, 130 Blast Dmg)
`,
  },
];
