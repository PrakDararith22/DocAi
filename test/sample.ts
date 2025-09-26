/**
 * Sample TypeScript file for testing DocAI parser
 */

// Interface
interface User {
    id: number;
    name: string;
    email: string;
}

// Function with TypeScript types and JSDoc
/**
 * Creates a new user object
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @returns {User} User object
 */
function createUser(name: string, email: string): User {
    return {
        id: Math.floor(Math.random() * 1000),
        name,
        email
    };
}

// Function without JSDoc
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Class with TypeScript and JSDoc
/**
 * User management service
 */
class UserService {
    private users: User[] = [];
    
    constructor(initialUsers: User[] = []) {
        this.users = initialUsers;
    }
    
    /**
     * Add a new user to the service
     * @param {User} user - User to add
     * @returns {boolean} Success status
     */
    addUser(user: User): boolean {
        if (this.users.find(u => u.id === user.id)) {
            return false;
        }
        this.users.push(user);
        return true;
    }
    
    // Method without JSDoc
    getUserById(id: number): User | undefined {
        return this.users.find(user => user.id === id);
    }
    
    getAllUsers(): User[] {
        return [...this.users];
    }
}

// Generic function
function processArray<T>(items: T[], processor: (item: T) => T): T[] {
    return items.map(processor);
}

// Arrow function with complex types
const filterUsers = (users: User[], predicate: (user: User) => boolean): User[] => {
    return users.filter(predicate);
};

// Abstract class
abstract class BaseRepository<T> {
    protected items: T[] = [];
    
    abstract save(item: T): Promise<T>;
    abstract findById(id: number): Promise<T | null>;
    
    // Method without JSDoc
    getAll(): T[] {
        return [...this.items];
    }
}

// Enum
enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest'
}

// Function with union types
function formatUserRole(role: UserRole | string): string {
    return role.toUpperCase();
}
